import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CafeTable } from './entities/cafe-table.entity';
import { TableJoinRequest } from './entities/table-join-request.entity';
import { User } from '../users/entities/user.entity';
import { Cafe } from '../cafes/entities/cafe.entity';
import { OpenTableDto } from './dto/open-table.dto';
import { JoinTableDto } from './dto/join-table.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';
import { PointsService } from '../achievements/points.service';

const ACTIVE_CAFES_CACHE_MS = 30_000;

/** Public shape of a user shown on table cards. */
function publicUser(u?: User | null) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    username: u.username ?? null,
    avatarUrl: u.avatarUrl ?? null,
  };
}

@Injectable()
export class TablesService {
  private activeCafesCache: { at: number; ids: number[] } | null = null;

  constructor(
    @InjectRepository(CafeTable)
    private readonly tableRepo: Repository<CafeTable>,
    @InjectRepository(TableJoinRequest)
    private readonly requestRepo: Repository<TableJoinRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Cafe)
    private readonly cafeRepo: Repository<Cafe>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly achievementsService: AchievementsService,
    private readonly pointsService: PointsService,
  ) {}

  // ── Open / close ──────────────────────────────────────────────────────────

  async openTable(userId: number, dto: OpenTableDto) {
    const host = await this.userRepo.findOne({ where: { id: userId } });
    if (!host) throw new NotFoundException('User tidak ditemukan');

    const cafe = await this.cafeRepo.findOne({
      where: { id: dto.cafeId, isActive: true },
    });
    if (!cafe) throw new NotFoundException('Cafe tidak ditemukan');

    const genderRule = dto.genderRule ?? 'any';
    if (genderRule !== 'any') {
      if (!this.genderRulesEnabled()) {
        throw new BadRequestException('Aturan gender belum tersedia');
      }
      if (!host.gender) {
        throw new BadRequestException(
          'Atur gender di profil dulu untuk pakai aturan ini',
        );
      }
      const wanted = genderRule === 'female_only' ? 'female' : 'male';
      if (host.gender !== wanted) {
        throw new BadRequestException(
          'Aturan ini nggak cocok sama profil kamu',
        );
      }
    }

    const expiresAt = new Date(
      Date.now() + this.maxDurationHours() * 3_600_000,
    );
    const table = this.tableRepo.create({
      hostUserId: userId,
      cafeId: dto.cafeId,
      status: 'open' as const,
      hostActive: userId,
      title: dto.title?.trim() || null,
      maxGuests: dto.maxGuests ?? 4,
      genderRule,
      expiresAt,
    });

    let saved: CafeTable;
    try {
      saved = await this.tableRepo.save(table);
    } catch (err: any) {
      // uq_table_host_active: user already has an open table (atomic guard).
      // Name the cafe so the user knows where to close it.
      if (this.isDupEntry(err)) {
        let existingCafeName: string | null = null;
        try {
          const existing = await this.tableRepo.findOne({
            where: { hostActive: userId },
          });
          if (existing) {
            const existingCafe = await this.cafeRepo.findOne({
              where: { id: existing.cafeId },
            });
            existingCafeName = existingCafe?.name ?? null;
          }
        } catch {
          // best-effort — fall back to the generic message
        }
        throw new ConflictException(
          existingCafeName
            ? `Kamu masih punya open table di ${existingCafeName}. Close table dulu untuk buka di cafe lain.`
            : 'Kamu masih punya open table aktif. Close table dulu untuk buka di cafe lain.',
        );
      }
      throw err;
    }
    this.activeCafesCache = null;

    try {
      await this.pointsService.award(userId, 'table_open', `table_open:${saved.id}`, {
        tableId: saved.id,
        cafeId: dto.cafeId,
      });
      await this.achievementsService.checkTableAchievements(userId);
      const hour = new Date().getHours();
      if (hour >= 21) {
        await this.achievementsService.awardBySlug(userId, 'special-night-owl-table');
      } else if (hour < 9) {
        await this.achievementsService.awardBySlug(userId, 'special-early-table');
      }
    } catch (err: any) {
      console.warn('[tables] open hooks failed:', err?.message);
    }

    return { ...saved, cafeName: cafe.name };
  }

  async closeTable(userId: number, tableId: number) {
    const table = await this.tableRepo.findOne({
      where: { id: tableId, hostUserId: userId },
    });
    if (!table) throw new NotFoundException('Meja tidak ditemukan');
    if (table.status !== 'open') {
      throw new ConflictException('Meja sudah tidak aktif');
    }

    await this.tableRepo.update(
      { id: table.id, status: 'open' },
      { status: 'closed', hostActive: null, closedAt: new Date() },
    );
    await this.requestRepo.update(
      { tableId: table.id, status: 'pending' },
      { status: 'expired', respondedAt: new Date() },
    );
    this.activeCafesCache = null;

    try {
      const [accepted, cafe] = await Promise.all([
        this.requestRepo.find({
          where: { tableId: table.id, status: 'accepted' },
        }),
        this.cafeRepo.findOne({ where: { id: table.cafeId } }),
      ]);
      for (const r of accepted) {
        await this.notificationsService.sendToUser(
          r.userId,
          'table_closed',
          'Table Closed',
          `Open table di ${cafe?.name ?? 'cafe'} sudah ditutup host.`,
          { tableId: table.id, cafeId: table.cafeId },
        );
      }
    } catch (err: any) {
      console.warn('[tables] close notifications failed:', err?.message);
    }

    return { message: 'Meja ditutup' };
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  /** Host's active table incl. accepted members + pending requests (poll target). */
  async myActive(userId: number) {
    const table = await this.tableRepo.findOne({
      where: { hostActive: userId },
    });
    if (!table) return null;
    if (await this.expireIfStale(table)) return null;

    const [cafe, requests] = await Promise.all([
      this.cafeRepo.findOne({ where: { id: table.cafeId } }),
      this.requestRepo.find({
        where: { tableId: table.id, status: In(['pending', 'accepted']) },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      }),
    ]);

    const members = requests
      .filter((r) => r.status === 'accepted')
      .map((r) => publicUser(r.user));
    const pendingRequests = requests
      .filter((r) => r.status === 'pending')
      .map((r) => ({
        id: r.id,
        message: r.message,
        createdAt: r.createdAt,
        user: publicUser(r.user),
      }));

    return {
      id: table.id,
      status: table.status,
      title: table.title,
      maxGuests: table.maxGuests,
      genderRule: table.genderRule,
      openedAt: table.openedAt,
      expiresAt: table.expiresAt,
      cafe: cafe
        ? { id: cafe.id, name: cafe.name, slug: cafe.slug ?? null }
        : null,
      acceptedCount: members.length,
      members,
      pendingRequests,
    };
  }

  /** Requester's outgoing requests + their status (poll target). */
  async myRequests(userId: number) {
    const rows = await this.requestRepo.find({
      where: { userId },
      relations: ['table', 'table.cafe', 'table.host'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
      table: r.table
        ? {
            id: r.table.id,
            title: r.table.title,
            status: r.table.status,
            expiresAt: r.table.expiresAt,
            cafe: r.table.cafe
              ? {
                  id: r.table.cafe.id,
                  name: r.table.cafe.name,
                  slug: r.table.cafe.slug ?? null,
                }
              : null,
            host: publicUser(r.table.host),
          }
        : null,
    }));
  }

  /** Open tables at a cafe — powers the map pin popup list. */
  async listByCafe(cafeId: number, userId?: number) {
    // Lazy-expire stale tables at this cafe so the list is authoritative.
    await this.dataSource.query(
      `UPDATE cafe_tables SET status='expired', host_active=NULL, closed_at=NOW()
       WHERE cafe_id = ? AND status='open' AND expires_at <= NOW()`,
      [cafeId],
    );
    await this.dataSource.query(
      `UPDATE table_join_requests r
       JOIN cafe_tables t ON t.id = r.table_id
       SET r.status='expired', r.responded_at=NOW()
       WHERE r.status='pending' AND t.cafe_id = ? AND t.status <> 'open'`,
      [cafeId],
    );

    const rows: any[] = await this.dataSource.query(
      `SELECT t.id, t.title, t.max_guests AS maxGuests, t.gender_rule AS genderRule,
              t.opened_at AS openedAt, t.expires_at AS expiresAt,
              u.id AS hostId, u.name AS hostName, u.username AS hostUsername,
              u.avatar_url AS hostAvatarUrl,
              (SELECT COUNT(*) FROM table_join_requests r
                WHERE r.table_id = t.id AND r.status = 'accepted') AS acceptedCount,
              mr.status AS myRequestStatus
       FROM cafe_tables t
       JOIN users u ON u.id = t.host_user_id AND u.deleted_at IS NULL
       LEFT JOIN table_join_requests mr ON mr.table_id = t.id AND mr.user_id = ?
       WHERE t.cafe_id = ? AND t.status = 'open' AND t.expires_at > NOW()
       ORDER BY t.opened_at DESC`,
      [userId ?? 0, cafeId],
    );

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      maxGuests: Number(r.maxGuests),
      acceptedCount: Number(r.acceptedCount),
      genderRule: r.genderRule,
      openedAt: r.openedAt,
      expiresAt: r.expiresAt,
      host: {
        id: r.hostId,
        name: r.hostName,
        username: r.hostUsername ?? null,
        avatarUrl: r.hostAvatarUrl ?? null,
      },
      myRequestStatus: r.myRequestStatus ?? null,
      isMine: userId ? r.hostId === userId : false,
    }));
  }

  /** Public: cafes with ≥1 open table — powers the emerald map pins. */
  async activeCafeIds() {
    if (
      this.activeCafesCache &&
      Date.now() - this.activeCafesCache.at < ACTIVE_CAFES_CACHE_MS
    ) {
      return { cafeIds: this.activeCafesCache.ids };
    }
    const rows: any[] = await this.dataSource.query(
      `SELECT DISTINCT t.cafe_id AS cafeId
       FROM cafe_tables t
       JOIN users u ON u.id = t.host_user_id AND u.deleted_at IS NULL
       WHERE t.status = 'open' AND t.expires_at > NOW()`,
    );
    const ids = rows.map((r) => Number(r.cafeId));
    this.activeCafesCache = { at: Date.now(), ids };
    return { cafeIds: ids };
  }

  // ── Join requests ─────────────────────────────────────────────────────────

  async requestJoin(userId: number, tableId: number, dto: JoinTableDto) {
    const requester = await this.userRepo.findOne({ where: { id: userId } });
    if (!requester) throw new NotFoundException('User tidak ditemukan');

    const table = await this.tableRepo.findOne({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Meja tidak ditemukan');
    if ((await this.expireIfStale(table)) || table.status !== 'open') {
      throw new BadRequestException('Meja sudah ditutup');
    }
    if (table.hostUserId === userId) {
      throw new BadRequestException('Ini meja kamu sendiri 😄');
    }

    // Host soft-deleted → table is a zombie; close it and 404.
    const host = await this.userRepo.findOne({
      where: { id: table.hostUserId },
    });
    if (!host) {
      await this.tableRepo.update(
        { id: table.id, status: 'open' },
        { status: 'closed', hostActive: null, closedAt: new Date() },
      );
      this.activeCafesCache = null;
      throw new NotFoundException('Meja tidak ditemukan');
    }

    // Requester must not be hosting their own open table.
    const hosting = await this.tableRepo.findOne({
      where: { hostActive: userId },
    });
    if (hosting && !(await this.expireIfStale(hosting))) {
      throw new ConflictException(
        'Close table kamu dulu sebelum join meja lain',
      );
    }

    if (table.genderRule !== 'any' && this.genderRulesEnabled()) {
      const wanted = table.genderRule === 'female_only' ? 'female' : 'male';
      const label = wanted === 'female' ? 'perempuan' : 'laki-laki';
      if (!requester.gender) {
        throw new BadRequestException(
          `Meja ini khusus ${label} — atur gender di profilmu dulu`,
        );
      }
      if (requester.gender !== wanted) {
        throw new BadRequestException(`Meja ini khusus ${label}`);
      }
    }

    // Soft capacity check (authoritative re-check happens at accept, under lock).
    const acceptedCount = await this.requestRepo.count({
      where: { tableId: table.id, status: 'accepted' },
    });
    if (acceptedCount >= table.maxGuests) {
      throw new BadRequestException('Meja sudah penuh');
    }

    const message = dto.message?.trim() || null;
    try {
      const saved = await this.requestRepo.save(
        this.requestRepo.create({ tableId: table.id, userId, message }),
      );
      await this.notifyHostOfRequest(table, requester, saved);
      return saved;
    } catch (err: any) {
      if (!this.isDupEntry(err)) throw err;
      // uq_table_request: this user already has a request row for this table.
      const existing = await this.requestRepo.findOne({
        where: { tableId: table.id, userId },
      });
      if (!existing) throw err;
      if (existing.status === 'pending') {
        throw new ConflictException('Request sudah dikirim');
      }
      if (existing.status === 'accepted') {
        throw new ConflictException('Kamu sudah join meja ini');
      }
      if (existing.status === 'declined') {
        throw new ConflictException('Host menolak request kamu');
      }
      // canceled/expired → boleh request ulang: reset row ke pending.
      existing.status = 'pending';
      existing.message = message;
      existing.respondedAt = null;
      const saved = await this.requestRepo.save(existing);
      await this.notifyHostOfRequest(table, requester, saved);
      return saved;
    }
  }

  async acceptRequest(hostId: number, requestId: number) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['table'],
    });
    if (!request || !request.table || request.table.hostUserId !== hostId) {
      throw new NotFoundException('Request tidak ditemukan');
    }
    if (request.status !== 'pending') {
      throw new ConflictException('Request sudah diproses');
    }

    // Capacity check + status flip under a row lock so two concurrent accepts
    // (or accept vs expiry) serialize on the table row.
    let acceptedCount = 0;
    let maxGuests = 0;
    await this.dataSource.transaction(async (em) => {
      const [t] = await em.query(
        `SELECT id, status, expires_at AS expiresAt, max_guests AS maxGuests
         FROM cafe_tables WHERE id = ? AND host_user_id = ? FOR UPDATE`,
        [request.tableId, hostId],
      );
      if (!t) throw new NotFoundException('Meja tidak ditemukan');
      if (t.status !== 'open' || new Date(t.expiresAt).getTime() <= Date.now()) {
        throw new ConflictException('Meja sudah ditutup');
      }
      const [{ cnt }] = await em.query(
        `SELECT COUNT(*) AS cnt FROM table_join_requests
         WHERE table_id = ? AND status = 'accepted'`,
        [request.tableId],
      );
      maxGuests = Number(t.maxGuests);
      if (Number(cnt) >= maxGuests) {
        throw new ConflictException('Meja sudah penuh');
      }
      const res: any = await em.query(
        `UPDATE table_join_requests SET status = 'accepted', responded_at = NOW()
         WHERE id = ? AND status = 'pending'`,
        [requestId],
      );
      if (Number(res?.affectedRows ?? 0) !== 1) {
        throw new ConflictException('Request sudah diproses');
      }
      acceptedCount = Number(cnt) + 1;
    });

    const table = request.table;
    try {
      const cafe = await this.cafeRepo.findOne({ where: { id: table.cafeId } });
      await this.notificationsService.sendToUser(
        request.userId,
        'table_request_accepted',
        'Kamu Diterima! 🎉',
        `Host menerima kamu di ${cafe?.name ?? 'cafe'}. Selamat nongkrong!`,
        { tableId: table.id, cafeId: table.cafeId },
      );

      // Points: joiner + host-per-guest
      await this.pointsService.award(
        request.userId,
        'table_join',
        `table_join:${request.id}`,
        { tableId: table.id },
      );
      await this.pointsService.award(
        hostId,
        'table_host_guest',
        `table_host_guest:${request.id}`,
        { tableId: table.id },
      );

      // Squad session (≥4 accepted guests) — dedupe keys make this idempotent
      // and cover guests accepted after the 4th too.
      if (acceptedCount >= 4) {
        await this.pointsService.award(
          hostId,
          'table_squad_bonus',
          `table_squad:${table.id}`,
          { tableId: table.id },
        );
        const members = await this.requestRepo.find({
          where: { tableId: table.id, status: 'accepted' },
        });
        for (const m of members) {
          await this.pointsService.award(
            m.userId,
            'table_squad_member',
            `table_squad:${table.id}:u${m.userId}`,
            { tableId: table.id },
          );
        }
        const day = new Date().getDay();
        if (day === 0 || day === 6) {
          await this.achievementsService.awardBySlug(
            hostId,
            'special-weekend-squad',
          );
        }
      }
      if (acceptedCount >= maxGuests) {
        await this.achievementsService.awardBySlug(hostId, 'special-full-house');
      }
      await this.achievementsService.checkTableAchievements(hostId);
      await this.achievementsService.checkTableAchievements(request.userId);
    } catch (err: any) {
      console.warn('[tables] accept hooks failed:', err?.message);
    }

    return { message: 'Request diterima', acceptedCount };
  }

  async declineRequest(hostId: number, requestId: number) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['table'],
    });
    if (!request || !request.table || request.table.hostUserId !== hostId) {
      throw new NotFoundException('Request tidak ditemukan');
    }
    if (request.status !== 'pending') {
      throw new ConflictException('Request sudah diproses');
    }
    request.status = 'declined';
    request.respondedAt = new Date();
    await this.requestRepo.save(request);

    try {
      await this.notificationsService.sendToUser(
        request.userId,
        'table_request_declined',
        'Belum Bisa Join',
        'Host belum bisa menerima kamu di meja ini. Coba meja lain ya!',
        { tableId: request.tableId },
      );
    } catch (err: any) {
      console.warn('[tables] decline notification failed:', err?.message);
    }
    return { message: 'Request ditolak' };
  }

  async cancelRequest(userId: number, requestId: number) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId, userId },
    });
    if (!request) throw new NotFoundException('Request tidak ditemukan');
    if (request.status !== 'pending') {
      throw new ConflictException('Request sudah diproses');
    }
    request.status = 'canceled';
    request.respondedAt = new Date();
    await this.requestRepo.save(request);
    return { message: 'Request dibatalkan' };
  }

  // ── Expiry ────────────────────────────────────────────────────────────────

  /** Periodic sweep: expire overdue tables + their pending requests. */
  async expireStale(): Promise<number> {
    const res: any = await this.dataSource.query(
      `UPDATE cafe_tables SET status='expired', host_active=NULL, closed_at=NOW()
       WHERE status='open' AND expires_at <= NOW()`,
    );
    const expired = Number(res?.affectedRows ?? 0);
    if (expired > 0) {
      await this.dataSource.query(
        `UPDATE table_join_requests r
         JOIN cafe_tables t ON t.id = r.table_id
         SET r.status='expired', r.responded_at=NOW()
         WHERE r.status='pending' AND t.status = 'expired'`,
      );
      this.activeCafesCache = null;
    }
    return expired;
  }

  /** Lazy expiry on read. Returns true when the table just got expired. */
  private async expireIfStale(table: CafeTable): Promise<boolean> {
    if (
      table.status === 'open' &&
      new Date(table.expiresAt).getTime() <= Date.now()
    ) {
      await this.tableRepo.update(
        { id: table.id, status: 'open' },
        { status: 'expired', hostActive: null, closedAt: new Date() },
      );
      await this.requestRepo.update(
        { tableId: table.id, status: 'pending' },
        { status: 'expired', respondedAt: new Date() },
      );
      table.status = 'expired';
      this.activeCafesCache = null;
      return true;
    }
    return false;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async notifyHostOfRequest(
    table: CafeTable,
    requester: User,
    request: TableJoinRequest,
  ) {
    try {
      const cafe = await this.cafeRepo.findOne({ where: { id: table.cafeId } });
      await this.notificationsService.sendToUser(
        table.hostUserId,
        'table_join_request',
        'Ada yang Mau Join! 🪑',
        `${requester.name} mau join ke open table kamu di ${cafe?.name ?? 'cafe'}`,
        { tableId: table.id, requestId: request.id, userId: requester.id },
      );
    } catch (err: any) {
      console.warn('[tables] join-request notification failed:', err?.message);
    }
  }

  private maxDurationHours(): number {
    const h = Number(this.config.get('TABLE_MAX_DURATION_HOURS'));
    return Number.isFinite(h) && h > 0 ? h : 8;
  }

  private genderRulesEnabled(): boolean {
    return this.config.get('TABLE_GENDER_RULES_ENABLED', 'true') !== 'false';
  }

  private isDupEntry(err: any): boolean {
    const code = err?.code ?? err?.driverError?.code;
    return code === 'ER_DUP_ENTRY';
  }
}
