import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TablesService } from './tables.service';

/**
 * Unit tests for the Open/Join Table feature. Repos/dataSource are mocked;
 * race conditions are simulated the way they actually surface at runtime:
 * ER_DUP_ENTRY from the unique host_active index, and affectedRows=0 from the
 * guarded UPDATE inside the accept transaction.
 */

const HOST_ID = 1;
const GUEST_ID = 2;
const CAFE_ID = 10;
const TABLE_ID = 5;

function dupEntryError(): Error {
  return Object.assign(new Error('ER_DUP_ENTRY: duplicate'), {
    code: 'ER_DUP_ENTRY',
  });
}

function makeMocks() {
  const env: Record<string, string | undefined> = {};
  const config = {
    get: jest.fn((key: string, def?: string) => env[key] ?? def),
  };

  const tableRepo = {
    create: jest.fn((v: any) => v),
    save: jest.fn(async (v: any) => ({ id: TABLE_ID, ...v })),
    findOne: jest.fn(async () => null),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const requestRepo = {
    create: jest.fn((v: any) => v),
    save: jest.fn(async (v: any) => ({ id: 99, ...v })),
    findOne: jest.fn(async () => null),
    find: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const userRepo = { findOne: jest.fn(async () => null) };
  const cafeRepo = {
    findOne: jest.fn(async () => ({
      id: CAFE_ID,
      name: 'Kopi Uji',
      slug: 'kopi-uji',
      isActive: true,
    })),
  };
  const friendshipRepo = { findOne: jest.fn(async () => null) };
  const em = { query: jest.fn() };
  const dataSource = {
    query: jest.fn(async () => []),
    transaction: jest.fn(async (cb: (m: any) => Promise<void>) => cb(em)),
  };
  const notifications = { sendToUser: jest.fn(async () => ({})) };
  const achievements = {
    checkTableAchievements: jest.fn(async () => []),
    awardBySlug: jest.fn(async () => []),
  };
  const points = { award: jest.fn(async () => 10) };

  const service = new TablesService(
    tableRepo as any,
    requestRepo as any,
    userRepo as any,
    cafeRepo as any,
    friendshipRepo as any,
    dataSource as any,
    config as any,
    notifications as any,
    achievements as any,
    points as any,
  );

  return {
    env,
    config,
    tableRepo,
    requestRepo,
    userRepo,
    cafeRepo,
    friendshipRepo,
    em,
    dataSource,
    notifications,
    achievements,
    points,
    service,
  };
}

/** userRepo.findOne dispatcher: requester vs host by where.id */
function usersById(
  userRepo: any,
  users: Record<number, any | null | undefined>,
) {
  userRepo.findOne.mockImplementation(async ({ where }: any) => {
    return users[where.id] ?? null;
  });
}

const HOST = {
  id: HOST_ID,
  name: 'Host',
  username: 'host1',
  avatarUrl: null,
  gender: 'female' as const,
};
const GUEST = {
  id: GUEST_ID,
  name: 'Guest',
  username: 'guest2',
  avatarUrl: null,
  gender: 'female' as const,
};

function openTableRow(overrides: Partial<any> = {}) {
  return {
    id: TABLE_ID,
    hostUserId: HOST_ID,
    cafeId: CAFE_ID,
    status: 'open',
    hostActive: HOST_ID,
    title: null,
    maxGuests: 4,
    genderRule: 'any',
    friendsOnly: false,
    expiresAt: new Date(Date.now() + 3_600_000),
    ...overrides,
  };
}

describe('TablesService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Rabu 8 Juli 2026, 13:00 — weekday, siang (no time-based specials)
    jest.setSystemTime(new Date(2026, 6, 8, 13, 0, 0).getTime());
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  // ── openTable ─────────────────────────────────────────────────────────────

  describe('openTable', () => {
    it('opens a table with the host-chosen capacity (incl. 200) and default 8h expiry', async () => {
      const m = makeMocks();
      usersById(m.userRepo, { [HOST_ID]: HOST });

      const res: any = await m.service.openTable(HOST_ID, {
        cafeId: CAFE_ID,
        maxGuests: 200,
        title: '  Nobar bareng  ',
      } as any);

      const saved = m.tableRepo.save.mock.calls[0][0];
      expect(saved.hostActive).toBe(HOST_ID); // race-guard column set
      expect(saved.status).toBe('open');
      expect(saved.maxGuests).toBe(200); // user-defined join capacity respected
      expect(saved.title).toBe('Nobar bareng');
      // default TABLE_MAX_DURATION_HOURS = 8
      expect(saved.expiresAt.getTime()).toBe(Date.now() + 8 * 3_600_000);
      expect(res.cafeName).toBe('Kopi Uji');

      expect(m.points.award).toHaveBeenCalledWith(
        HOST_ID,
        'table_open',
        `table_open:${TABLE_ID}`,
        expect.any(Object),
      );
      expect(m.achievements.checkTableAchievements).toHaveBeenCalledWith(
        HOST_ID,
      );
    });

    it('honors a custom TABLE_MAX_DURATION_HOURS', async () => {
      const m = makeMocks();
      m.env.TABLE_MAX_DURATION_HOURS = '2';
      usersById(m.userRepo, { [HOST_ID]: HOST });

      await m.service.openTable(HOST_ID, { cafeId: CAFE_ID } as any);
      const saved = m.tableRepo.save.mock.calls[0][0];
      expect(saved.expiresAt.getTime()).toBe(Date.now() + 2 * 3_600_000);
    });

    it('rejects when the cafe does not exist / is inactive', async () => {
      const m = makeMocks();
      usersById(m.userRepo, { [HOST_ID]: HOST });
      m.cafeRepo.findOne.mockResolvedValueOnce(null as any);
      await expect(
        m.service.openTable(HOST_ID, { cafeId: 999 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a gender rule when the host has no gender set', async () => {
      const m = makeMocks();
      usersById(m.userRepo, { [HOST_ID]: { ...HOST, gender: null } });
      await expect(
        m.service.openTable(HOST_ID, {
          cafeId: CAFE_ID,
          genderRule: 'female_only',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a gender rule that doesn't match the host's own gender", async () => {
      const m = makeMocks();
      usersById(m.userRepo, { [HOST_ID]: { ...HOST, gender: 'male' } });
      await expect(
        m.service.openTable(HOST_ID, {
          cafeId: CAFE_ID,
          genderRule: 'female_only',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-any gender rules when TABLE_GENDER_RULES_ENABLED=false', async () => {
      const m = makeMocks();
      m.env.TABLE_GENDER_RULES_ENABLED = 'false';
      usersById(m.userRepo, { [HOST_ID]: HOST });
      await expect(
        m.service.openTable(HOST_ID, {
          cafeId: CAFE_ID,
          genderRule: 'female_only',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('maps ER_DUP_ENTRY on host_active to 409 "meja masih aktif" (one active table per user)', async () => {
      const m = makeMocks();
      usersById(m.userRepo, { [HOST_ID]: HOST });
      m.tableRepo.save.mockRejectedValueOnce(dupEntryError());
      const err = await m.service
        .openTable(HOST_ID, { cafeId: CAFE_ID } as any)
        .catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).toContain('meja aktif');
    });

    it('awards the night-owl special when opened at 21:00+', async () => {
      const m = makeMocks();
      jest.setSystemTime(new Date(2026, 6, 8, 22, 0, 0).getTime());
      usersById(m.userRepo, { [HOST_ID]: HOST });
      await m.service.openTable(HOST_ID, { cafeId: CAFE_ID } as any);
      expect(m.achievements.awardBySlug).toHaveBeenCalledWith(
        HOST_ID,
        'special-night-owl-table',
      );
    });

    it('awards the early-bird special when opened before 09:00', async () => {
      const m = makeMocks();
      jest.setSystemTime(new Date(2026, 6, 8, 7, 30, 0).getTime());
      usersById(m.userRepo, { [HOST_ID]: HOST });
      await m.service.openTable(HOST_ID, { cafeId: CAFE_ID } as any);
      expect(m.achievements.awardBySlug).toHaveBeenCalledWith(
        HOST_ID,
        'special-early-table',
      );
    });

    it('still succeeds when the points/achievement hooks throw', async () => {
      const m = makeMocks();
      usersById(m.userRepo, { [HOST_ID]: HOST });
      m.points.award.mockRejectedValueOnce(new Error('ledger down'));
      await expect(
        m.service.openTable(HOST_ID, { cafeId: CAFE_ID } as any),
      ).resolves.toMatchObject({ id: TABLE_ID });
    });
  });

  // ── requestJoin ───────────────────────────────────────────────────────────

  describe('requestJoin', () => {
    /** Wire the happy-path mocks; individual tests override pieces. */
    function joinSetup(m: ReturnType<typeof makeMocks>, table = openTableRow()) {
      usersById(m.userRepo, { [GUEST_ID]: GUEST, [HOST_ID]: HOST });
      m.tableRepo.findOne.mockImplementation(async ({ where }: any) => {
        if ('id' in where) return table as any;
        if ('hostActive' in where) return null; // guest hosts nothing
        return null;
      });
      return table;
    }

    it('rejects when the table does not exist', async () => {
      const m = makeMocks();
      usersById(m.userRepo, { [GUEST_ID]: GUEST });
      m.tableRepo.findOne.mockResolvedValue(null as any);
      await expect(
        m.service.requestJoin(GUEST_ID, TABLE_ID, {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lazy-expires an overdue table and rejects with "Meja sudah tutup"', async () => {
      const m = makeMocks();
      const table = joinSetup(
        m,
        openTableRow({ expiresAt: new Date(Date.now() - 1000) }),
      );
      const err = await m.service
        .requestJoin(GUEST_ID, TABLE_ID, {})
        .catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('tutup');
      // Lazy expiry flipped the row + its pending requests
      expect(m.tableRepo.update).toHaveBeenCalledWith(
        { id: table.id, status: 'open' },
        expect.objectContaining({ status: 'expired', hostActive: null }),
      );
      expect(m.requestRepo.update).toHaveBeenCalledWith(
        { tableId: table.id, status: 'pending' },
        expect.objectContaining({ status: 'expired' }),
      );
    });

    it('rejects joining your own table', async () => {
      const m = makeMocks();
      joinSetup(m);
      await expect(
        m.service.requestJoin(HOST_ID, TABLE_ID, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('closes the table and 404s when the host is soft-deleted', async () => {
      const m = makeMocks();
      joinSetup(m);
      usersById(m.userRepo, { [GUEST_ID]: GUEST, [HOST_ID]: null });
      await expect(
        m.service.requestJoin(GUEST_ID, TABLE_ID, {}),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(m.tableRepo.update).toHaveBeenCalledWith(
        { id: TABLE_ID, status: 'open' },
        expect.objectContaining({ status: 'closed', hostActive: null }),
      );
    });

    it('rejects when the requester is hosting their own open table', async () => {
      const m = makeMocks();
      joinSetup(m);
      m.tableRepo.findOne.mockImplementation(async ({ where }: any) => {
        if ('id' in where) return openTableRow() as any;
        if ('hostActive' in where)
          return openTableRow({ id: 77, hostUserId: GUEST_ID, hostActive: GUEST_ID }) as any;
        return null;
      });
      const err = await m.service
        .requestJoin(GUEST_ID, TABLE_ID, {})
        .catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).toContain('Tutup meja kamu dulu');
    });

    it('enforces friends-only tables via the friendships table', async () => {
      const m = makeMocks();
      joinSetup(m, openTableRow({ friendsOnly: true }));
      m.friendshipRepo.findOne.mockResolvedValue(null as any);
      await expect(
        m.service.requestJoin(GUEST_ID, TABLE_ID, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
      // ordered-pair lookup (min, max)
      expect(m.friendshipRepo.findOne).toHaveBeenCalledWith({
        where: { userAId: HOST_ID, userBId: GUEST_ID },
      });
    });

    it('requires the requester to set their gender for gender-ruled tables', async () => {
      const m = makeMocks();
      joinSetup(m, openTableRow({ genderRule: 'female_only' }));
      usersById(m.userRepo, {
        [GUEST_ID]: { ...GUEST, gender: null },
        [HOST_ID]: HOST,
      });
      const err = await m.service
        .requestJoin(GUEST_ID, TABLE_ID, {})
        .catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('atur gender');
    });

    it("rejects a requester whose gender doesn't match the rule", async () => {
      const m = makeMocks();
      joinSetup(m, openTableRow({ genderRule: 'female_only' }));
      usersById(m.userRepo, {
        [GUEST_ID]: { ...GUEST, gender: 'male' },
        [HOST_ID]: HOST,
      });
      await expect(
        m.service.requestJoin(GUEST_ID, TABLE_ID, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the table is already at the host-chosen capacity', async () => {
      const m = makeMocks();
      joinSetup(m, openTableRow({ maxGuests: 2 }));
      m.requestRepo.count.mockResolvedValue(2 as any);
      const err = await m.service
        .requestJoin(GUEST_ID, TABLE_ID, {})
        .catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('penuh');
    });

    it('saves the request and notifies the host on success', async () => {
      const m = makeMocks();
      joinSetup(m);
      const res: any = await m.service.requestJoin(GUEST_ID, TABLE_ID, {
        message: ' Boleh ikut? ',
      });
      expect(res.id).toBe(99);
      expect(m.requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId: TABLE_ID,
          userId: GUEST_ID,
          message: 'Boleh ikut?',
        }),
      );
      expect(m.notifications.sendToUser).toHaveBeenCalledWith(
        HOST_ID,
        'table_join_request',
        expect.any(String),
        expect.stringContaining('Guest'),
        expect.objectContaining({ tableId: TABLE_ID }),
      );
    });

    it.each([
      ['pending', 'sudah dikirim'],
      ['accepted', 'sudah gabung'],
      ['declined', 'menolak'],
    ])(
      'maps a duplicate request with status=%s to a specific 409',
      async (status, fragment) => {
        const m = makeMocks();
        joinSetup(m);
        m.requestRepo.save.mockRejectedValueOnce(dupEntryError());
        m.requestRepo.findOne.mockResolvedValueOnce({
          id: 50,
          tableId: TABLE_ID,
          userId: GUEST_ID,
          status,
        } as any);
        const err = await m.service
          .requestJoin(GUEST_ID, TABLE_ID, {})
          .catch((e) => e);
        expect(err).toBeInstanceOf(ConflictException);
        expect(err.message).toContain(fragment);
      },
    );

    it('re-opens a previously canceled request back to pending', async () => {
      const m = makeMocks();
      joinSetup(m);
      m.requestRepo.save
        .mockRejectedValueOnce(dupEntryError())
        .mockImplementationOnce(async (v: any) => v);
      m.requestRepo.findOne.mockResolvedValueOnce({
        id: 50,
        tableId: TABLE_ID,
        userId: GUEST_ID,
        status: 'canceled',
        message: 'old',
        respondedAt: new Date(),
      } as any);

      const res: any = await m.service.requestJoin(GUEST_ID, TABLE_ID, {
        message: 'lagi dong',
      });
      expect(res.status).toBe('pending');
      expect(res.message).toBe('lagi dong');
      expect(res.respondedAt).toBeNull();
      expect(m.notifications.sendToUser).toHaveBeenCalled();
    });
  });

  // ── acceptRequest ─────────────────────────────────────────────────────────

  describe('acceptRequest', () => {
    function acceptSetup(
      m: ReturnType<typeof makeMocks>,
      {
        acceptedBefore = 0,
        maxGuests = 4,
        tableStatus = 'open',
        affectedRows = 1,
      } = {},
    ) {
      const request = {
        id: 40,
        tableId: TABLE_ID,
        userId: GUEST_ID,
        status: 'pending',
        table: openTableRow({ maxGuests }),
      };
      m.requestRepo.findOne.mockResolvedValue(request as any);
      m.em.query.mockImplementation(async (sql: string) => {
        if (sql.includes('FOR UPDATE')) {
          return [
            {
              id: TABLE_ID,
              status: tableStatus,
              expiresAt: new Date(Date.now() + 3_600_000),
              maxGuests,
            },
          ];
        }
        if (sql.includes('COUNT(*)')) return [{ cnt: acceptedBefore }];
        if (sql.trim().startsWith('UPDATE')) return { affectedRows };
        return [];
      });
      return request;
    }

    it("404s when the request doesn't belong to a table the caller hosts", async () => {
      const m = makeMocks();
      const request = acceptSetup(m);
      request.table.hostUserId = 999;
      await expect(
        m.service.acceptRequest(HOST_ID, 40),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('409s when the request was already processed', async () => {
      const m = makeMocks();
      const request = acceptSetup(m);
      request.status = 'declined';
      await expect(
        m.service.acceptRequest(HOST_ID, 40),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('409s when the table is full — capacity checked under the row lock', async () => {
      const m = makeMocks();
      acceptSetup(m, { acceptedBefore: 4, maxGuests: 4 });
      const err = await m.service.acceptRequest(HOST_ID, 40).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).toContain('penuh');
    });

    it('409s when the table closed/expired between read and lock', async () => {
      const m = makeMocks();
      acceptSetup(m, { tableStatus: 'closed' });
      await expect(
        m.service.acceptRequest(HOST_ID, 40),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('409s on the double-accept race (guarded UPDATE affected 0 rows)', async () => {
      const m = makeMocks();
      acceptSetup(m, { affectedRows: 0 });
      const err = await m.service.acceptRequest(HOST_ID, 40).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).toContain('sudah diproses');
    });

    it('notifies + awards points to joiner and host on success', async () => {
      const m = makeMocks();
      acceptSetup(m, { acceptedBefore: 0 });
      const res = await m.service.acceptRequest(HOST_ID, 40);
      expect(res).toMatchObject({ acceptedCount: 1 });
      expect(m.notifications.sendToUser).toHaveBeenCalledWith(
        GUEST_ID,
        'table_request_accepted',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
      expect(m.points.award).toHaveBeenCalledWith(
        GUEST_ID,
        'table_join',
        'table_join:40',
        expect.any(Object),
      );
      expect(m.points.award).toHaveBeenCalledWith(
        HOST_ID,
        'table_host_guest',
        'table_host_guest:40',
        expect.any(Object),
      );
      expect(m.achievements.checkTableAchievements).toHaveBeenCalledWith(HOST_ID);
      expect(m.achievements.checkTableAchievements).toHaveBeenCalledWith(GUEST_ID);
      // 1 accepted guest — no squad bonus yet
      expect(m.points.award).not.toHaveBeenCalledWith(
        HOST_ID,
        'table_squad_bonus',
        expect.anything(),
        expect.anything(),
      );
    });

    it('fires the squad bonus (host + each member, idempotent keys) on the 4th accept', async () => {
      const m = makeMocks();
      acceptSetup(m, { acceptedBefore: 3, maxGuests: 6 });
      m.requestRepo.find.mockResolvedValue([
        { userId: 2 },
        { userId: 3 },
        { userId: 4 },
        { userId: 5 },
      ] as any);

      await m.service.acceptRequest(HOST_ID, 40);
      expect(m.points.award).toHaveBeenCalledWith(
        HOST_ID,
        'table_squad_bonus',
        `table_squad:${TABLE_ID}`,
        expect.any(Object),
      );
      for (const uid of [2, 3, 4, 5]) {
        expect(m.points.award).toHaveBeenCalledWith(
          uid,
          'table_squad_member',
          `table_squad:${TABLE_ID}:u${uid}`,
          expect.any(Object),
        );
      }
      // Rabu — bukan weekend
      expect(m.achievements.awardBySlug).not.toHaveBeenCalledWith(
        HOST_ID,
        'special-weekend-squad',
      );
    });

    it('awards the weekend-squad special when the 4th accept lands on Saturday', async () => {
      const m = makeMocks();
      jest.setSystemTime(new Date(2026, 6, 11, 15, 0, 0).getTime()); // Sabtu 11 Juli 2026
      acceptSetup(m, { acceptedBefore: 3, maxGuests: 6 });
      m.requestRepo.find.mockResolvedValue([] as any);
      await m.service.acceptRequest(HOST_ID, 40);
      expect(m.achievements.awardBySlug).toHaveBeenCalledWith(
        HOST_ID,
        'special-weekend-squad',
      );
    });

    it('awards the full-house special when capacity is reached', async () => {
      const m = makeMocks();
      acceptSetup(m, { acceptedBefore: 1, maxGuests: 2 });
      await m.service.acceptRequest(HOST_ID, 40);
      expect(m.achievements.awardBySlug).toHaveBeenCalledWith(
        HOST_ID,
        'special-full-house',
      );
    });
  });

  // ── decline / cancel / close ──────────────────────────────────────────────

  describe('declineRequest', () => {
    it('404s for a request on a table the caller does not host', async () => {
      const m = makeMocks();
      m.requestRepo.findOne.mockResolvedValue({
        id: 40,
        status: 'pending',
        table: openTableRow({ hostUserId: 999 }),
      } as any);
      await expect(
        m.service.declineRequest(HOST_ID, 40),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('declines a pending request and notifies the requester', async () => {
      const m = makeMocks();
      m.requestRepo.findOne.mockResolvedValue({
        id: 40,
        tableId: TABLE_ID,
        userId: GUEST_ID,
        status: 'pending',
        table: openTableRow(),
      } as any);
      m.requestRepo.save.mockImplementation(async (v: any) => v);

      await m.service.declineRequest(HOST_ID, 40);
      expect(m.requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'declined' }),
      );
      expect(m.notifications.sendToUser).toHaveBeenCalledWith(
        GUEST_ID,
        'table_request_declined',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('cancelRequest', () => {
    it('lets the requester cancel their own pending request', async () => {
      const m = makeMocks();
      m.requestRepo.findOne.mockResolvedValue({
        id: 40,
        userId: GUEST_ID,
        status: 'pending',
      } as any);
      m.requestRepo.save.mockImplementation(async (v: any) => v);
      await m.service.cancelRequest(GUEST_ID, 40);
      expect(m.requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'canceled' }),
      );
    });

    it('409s when the request is no longer pending', async () => {
      const m = makeMocks();
      m.requestRepo.findOne.mockResolvedValue({
        id: 40,
        userId: GUEST_ID,
        status: 'accepted',
      } as any);
      await expect(
        m.service.cancelRequest(GUEST_ID, 40),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('closeTable', () => {
    it('404s for a table the caller does not host', async () => {
      const m = makeMocks();
      m.tableRepo.findOne.mockResolvedValue(null as any);
      await expect(
        m.service.closeTable(HOST_ID, TABLE_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('409s when the table is not open anymore', async () => {
      const m = makeMocks();
      m.tableRepo.findOne.mockResolvedValue(
        openTableRow({ status: 'expired' }) as any,
      );
      await expect(
        m.service.closeTable(HOST_ID, TABLE_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('closes the table, expires pending requests, and notifies accepted members', async () => {
      const m = makeMocks();
      m.tableRepo.findOne.mockResolvedValue(openTableRow() as any);
      m.requestRepo.find.mockResolvedValue([
        { userId: 2 },
        { userId: 3 },
      ] as any);

      await m.service.closeTable(HOST_ID, TABLE_ID);
      expect(m.tableRepo.update).toHaveBeenCalledWith(
        { id: TABLE_ID, status: 'open' },
        expect.objectContaining({ status: 'closed', hostActive: null }),
      );
      expect(m.requestRepo.update).toHaveBeenCalledWith(
        { tableId: TABLE_ID, status: 'pending' },
        expect.objectContaining({ status: 'expired' }),
      );
      expect(m.notifications.sendToUser).toHaveBeenCalledTimes(2);
      expect(m.notifications.sendToUser).toHaveBeenCalledWith(
        2,
        'table_closed',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  // ── expiry sweep, cache, myActive ─────────────────────────────────────────

  describe('expireStale', () => {
    it('expires overdue tables and cascades to their pending requests', async () => {
      const m = makeMocks();
      m.dataSource.query
        .mockResolvedValueOnce({ affectedRows: 3 } as any)
        .mockResolvedValueOnce({} as any);
      const expired = await m.service.expireStale();
      expect(expired).toBe(3);
      expect(m.dataSource.query).toHaveBeenCalledTimes(2);
    });

    it('skips the cascade when nothing expired', async () => {
      const m = makeMocks();
      m.dataSource.query.mockResolvedValueOnce({ affectedRows: 0 } as any);
      const expired = await m.service.expireStale();
      expect(expired).toBe(0);
      expect(m.dataSource.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('activeCafeIds', () => {
    it('caches the result for 30s (one DB query for two calls)', async () => {
      const m = makeMocks();
      m.dataSource.query.mockResolvedValue([{ cafeId: 7 }, { cafeId: 8 }] as any);
      const first = await m.service.activeCafeIds();
      const second = await m.service.activeCafeIds();
      expect(first.cafeIds).toEqual([7, 8]);
      expect(second.cafeIds).toEqual([7, 8]);
      expect(m.dataSource.query).toHaveBeenCalledTimes(1);
    });

    it('re-queries after the cache window passes', async () => {
      const m = makeMocks();
      m.dataSource.query.mockResolvedValue([{ cafeId: 7 }] as any);
      await m.service.activeCafeIds();
      jest.setSystemTime(new Date(Date.now() + 31_000).getTime());
      await m.service.activeCafeIds();
      expect(m.dataSource.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('myActive', () => {
    it('returns null when the user hosts no table', async () => {
      const m = makeMocks();
      m.tableRepo.findOne.mockResolvedValue(null as any);
      await expect(m.service.myActive(HOST_ID)).resolves.toBeNull();
    });

    it('lazy-expires a stale table and returns null', async () => {
      const m = makeMocks();
      m.tableRepo.findOne.mockResolvedValue(
        openTableRow({ expiresAt: new Date(Date.now() - 1) }) as any,
      );
      await expect(m.service.myActive(HOST_ID)).resolves.toBeNull();
      expect(m.tableRepo.update).toHaveBeenCalledWith(
        { id: TABLE_ID, status: 'open' },
        expect.objectContaining({ status: 'expired', hostActive: null }),
      );
    });
  });
});
