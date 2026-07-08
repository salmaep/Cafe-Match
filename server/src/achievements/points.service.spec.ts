import { PointsService } from './points.service';
import { POINT_VALUES } from './points.constants';

/**
 * Points ledger unit tests. The dedupe behavior mirrors production exactly:
 * a duplicate dedupe_key surfaces as ER_DUP_ENTRY from the unique index and
 * must resolve to a silent no-op (null), never a thrown error.
 */

function makeMocks() {
  const em = { query: jest.fn() };
  const dataSource = {
    query: jest.fn(async () => []),
    transaction: jest.fn(async (cb: (m: any) => Promise<void>) => cb(em)),
  };
  const achievements = { checkPointsAchievements: jest.fn(async () => []) };
  const service = new PointsService(dataSource as any, achievements as any);
  return { em, dataSource, achievements, service };
}

describe('PointsService', () => {
  describe('award', () => {
    it('inserts a ledger row, bumps the cached total, returns the new total, and checks points achievements', async () => {
      const { em, achievements, service } = makeMocks();
      em.query.mockImplementation(async (sql: string) => {
        if (sql.trim().startsWith('INSERT')) return {};
        if (sql.trim().startsWith('UPDATE')) return { affectedRows: 1 };
        if (sql.trim().startsWith('SELECT')) return [{ points: 60 }];
        return [];
      });

      const total = await service.award(7, 'checkin', 'checkin:123', {
        cafeId: 10,
      });

      expect(total).toBe(60);
      const insertCall = em.query.mock.calls.find(([sql]) =>
        (sql as string).trim().startsWith('INSERT'),
      )!;
      expect(insertCall[1]).toEqual([
        7,
        'checkin',
        POINT_VALUES.checkin,
        'checkin:123',
        JSON.stringify({ cafeId: 10 }),
      ]);
      const updateCall = em.query.mock.calls.find(([sql]) =>
        (sql as string).trim().startsWith('UPDATE'),
      )!;
      expect(updateCall[1]).toEqual([POINT_VALUES.checkin, 7]);
      expect(achievements.checkPointsAchievements).toHaveBeenCalledWith(7, 60);
    });

    it('returns null on a duplicate dedupe key (ER_DUP_ENTRY) without checking achievements', async () => {
      const { em, achievements, service } = makeMocks();
      em.query.mockRejectedValueOnce(
        Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }),
      );
      const total = await service.award(7, 'checkin', 'checkin:123');
      expect(total).toBeNull();
      expect(achievements.checkPointsAchievements).not.toHaveBeenCalled();
    });

    it('rethrows non-duplicate database errors', async () => {
      const { em, service } = makeMocks();
      em.query.mockRejectedValueOnce(new Error('connection lost'));
      await expect(
        service.award(7, 'checkin', 'checkin:123'),
      ).rejects.toThrow('connection lost');
    });

    it('is a no-op for an unknown event type', async () => {
      const { dataSource, service } = makeMocks();
      const total = await service.award(7, 'not_a_thing' as any, 'x:1');
      expect(total).toBeNull();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('still awards when achievements check throws (never fails the award)', async () => {
      const { em, achievements, service } = makeMocks();
      em.query.mockImplementation(async (sql: string) => {
        if (sql.trim().startsWith('SELECT')) return [{ points: 25 }];
        return {};
      });
      achievements.checkPointsAchievements.mockRejectedValueOnce(
        new Error('boom'),
      );
      await expect(service.award(7, 'table_open', 'table_open:1')).resolves.toBe(
        25,
      );
    });
  });

  describe('getSummary', () => {
    it('returns the cached total + recent ledger entries', async () => {
      const { dataSource, service } = makeMocks();
      dataSource.query
        .mockResolvedValueOnce([{ points: 120 }] as any)
        .mockResolvedValueOnce([
          { eventType: 'checkin', points: 10, meta: null, createdAt: 'x' },
        ] as any);
      const summary = await service.getSummary(7);
      expect(summary.total).toBe(120);
      expect(summary.recent).toHaveLength(1);
    });

    it('returns 0 for a user without a row', async () => {
      const { dataSource, service } = makeMocks();
      dataSource.query
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any);
      const summary = await service.getSummary(404);
      expect(summary.total).toBe(0);
    });
  });
});
