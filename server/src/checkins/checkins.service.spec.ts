import { BadRequestException } from '@nestjs/common';
import { CheckinsService } from './checkins.service';

/**
 * Check-in unit tests: the configurable GPS radius gate
 * (CHECKIN_RADIUS_METERS, default 500) and the points hooks
 * (per-checkin award + weekly streak bonus).
 */

const USER_ID = 7;
const CAFE_ID = 10;
const CHECKIN_ID = 77;

// Cafe pinned at (0,0); offsets give deterministic haversine distances:
const AT_CAFE = { latitude: 0, longitude: 0 }; // 0 m
const NEAR = { latitude: 0, longitude: 0.002 }; // ≈ 222 m
const FAR = { latitude: 0, longitude: 0.01 }; // ≈ 1113 m

function yesterdayStr(): string {
  return new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
}

function makeMocks({ globalStreakBefore = 0 } = {}) {
  const checkinRepo = {
    findOne: jest.fn(async () => null), // no active check-in
    create: jest.fn((v: any) => v),
    save: jest.fn(async (v: any) => ({ id: CHECKIN_ID, ...v })),
  };
  const globalStreak =
    globalStreakBefore > 0
      ? {
          userId: USER_ID,
          streakType: 'global',
          currentStreak: globalStreakBefore,
          longestStreak: globalStreakBefore,
          lastCheckinDate: yesterdayStr(), // 1 day gap → increments
        }
      : null;
  const streakRepo = {
    findOne: jest.fn(async ({ where }: any) =>
      where.streakType === 'global' ? globalStreak : null,
    ),
    create: jest.fn((v: any) => v),
    save: jest.fn(async (v: any) => v),
  };
  const cafeRepo = {
    findOne: jest.fn(async () => ({
      id: CAFE_ID,
      name: 'Kopi Uji',
      latitude: 0,
      longitude: 0,
      isActive: true,
    })),
  };
  const dataSource = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('SELECT name FROM users')) return [{ name: 'Dio' }];
      return []; // no friends at cafe
    }),
  };
  const achievements = { checkCheckinAchievements: jest.fn(async () => []) };
  const points = { award: jest.fn(async () => 10) };
  const notifications = { sendToUser: jest.fn(async () => ({})) };

  const service = new CheckinsService(
    checkinRepo as any,
    streakRepo as any,
    cafeRepo as any,
    dataSource as any,
    achievements as any,
    points as any,
    notifications as any,
  );
  return {
    checkinRepo,
    streakRepo,
    cafeRepo,
    dataSource,
    achievements,
    points,
    notifications,
    service,
  };
}

describe('CheckinsService', () => {
  const ENV_KEYS = ['CHECKIN_RADIUS_METERS', 'CHECKIN_SKIP_GPS'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  describe('GPS radius gate', () => {
    it('rejects beyond the default 500m with a message naming the radius', async () => {
      const { service } = makeMocks();
      const err = await service
        .checkIn(USER_ID, { cafeId: CAFE_ID, ...FAR } as any)
        .catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('within 500m');
    });

    it('allows ~222m under the default 500m radius', async () => {
      const { service } = makeMocks();
      await expect(
        service.checkIn(USER_ID, { cafeId: CAFE_ID, ...NEAR } as any),
      ).resolves.toMatchObject({ id: CHECKIN_ID, cafeName: 'Kopi Uji' });
    });

    it('honors a custom CHECKIN_RADIUS_METERS (100m gate + message)', async () => {
      process.env.CHECKIN_RADIUS_METERS = '100';
      const { service } = makeMocks();
      const err = await service
        .checkIn(USER_ID, { cafeId: CAFE_ID, ...NEAR } as any) // 222m > 100m
        .catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('within 100m');
    });

    it('bypasses the gate entirely with CHECKIN_SKIP_GPS=true', async () => {
      process.env.CHECKIN_SKIP_GPS = 'true';
      const { service } = makeMocks();
      await expect(
        service.checkIn(USER_ID, { cafeId: CAFE_ID, ...FAR } as any),
      ).resolves.toMatchObject({ id: CHECKIN_ID });
    });
  });

  describe('points hooks', () => {
    it('awards checkin points with an idempotent dedupe key', async () => {
      const { service, points } = makeMocks();
      await service.checkIn(USER_ID, { cafeId: CAFE_ID, ...AT_CAFE } as any);
      expect(points.award).toHaveBeenCalledWith(
        USER_ID,
        'checkin',
        `checkin:${CHECKIN_ID}`,
        { cafeId: CAFE_ID },
      );
    });

    it('awards the weekly streak bonus when the global streak hits a multiple of 7', async () => {
      // streak was 6 → today's check-in makes it 7
      const { service, points } = makeMocks({ globalStreakBefore: 6 });
      await service.checkIn(USER_ID, { cafeId: CAFE_ID, ...AT_CAFE } as any);
      expect(points.award).toHaveBeenCalledWith(
        USER_ID,
        'streak_week_bonus',
        `streak:global:${USER_ID}:7`,
        { streak: 7 },
      );
    });

    it('does NOT award the weekly bonus on non-multiples of 7', async () => {
      // streak was 4 → becomes 5
      const { service, points } = makeMocks({ globalStreakBefore: 4 });
      await service.checkIn(USER_ID, { cafeId: CAFE_ID, ...AT_CAFE } as any);
      expect(points.award).not.toHaveBeenCalledWith(
        USER_ID,
        'streak_week_bonus',
        expect.anything(),
        expect.anything(),
      );
    });

    it('still checks in when the points/achievements hooks throw', async () => {
      const { service, points } = makeMocks();
      points.award.mockRejectedValue(new Error('ledger down'));
      await expect(
        service.checkIn(USER_ID, { cafeId: CAFE_ID, ...AT_CAFE } as any),
      ).resolves.toMatchObject({ id: CHECKIN_ID });
    });
  });
});
