import { AchievementsService } from './achievements.service';

/**
 * Covers the NEW methods added for the points/tables wave:
 * awardBySlug, checkPointsAchievements, checkTableAchievements.
 * (The pre-existing check-in/social flows are exercised in production paths.)
 */

interface FakeAchievement {
  id: number;
  slug: string;
  name: string;
  category: string;
  threshold: number;
  purposeSlug?: string | null;
}

function makeMocks(catalog: FakeAchievement[]) {
  const achievementRepo = {
    findOne: jest.fn(async ({ where }: any) => {
      if ('slug' in where)
        return catalog.find((a) => a.slug === where.slug) ?? null;
      if ('id' in where) return catalog.find((a) => a.id === where.id) ?? null;
      return null;
    }),
    find: jest.fn(async ({ where }: any = {}) =>
      catalog.filter(
        (a) =>
          (!where?.category || a.category === where.category) &&
          (!where?.purposeSlug || a.purposeSlug === where.purposeSlug),
      ),
    ),
  };

  // In-memory user_achievements store keyed by achievementId.
  const store = new Map<number, any>();
  const userAchievementRepo = {
    findOne: jest.fn(
      async ({ where }: any) => store.get(where.achievementId) ?? null,
    ),
    create: jest.fn((v: any) => ({ ...v })),
    save: jest.fn(async (ua: any) => {
      store.set(ua.achievementId, ua);
      return ua;
    }),
    find: jest.fn(async () => Array.from(store.values())),
  };

  const dataSource = { query: jest.fn(async () => []) };
  const notifications = { sendToUser: jest.fn(async () => ({})) };

  const service = new AchievementsService(
    achievementRepo as any,
    userAchievementRepo as any,
    dataSource as any,
    notifications as any,
  );
  return {
    achievementRepo,
    userAchievementRepo,
    dataSource,
    notifications,
    service,
    store,
  };
}

describe('AchievementsService (new methods)', () => {
  describe('awardBySlug', () => {
    const catalog: FakeAchievement[] = [
      {
        id: 1,
        slug: 'special-full-house',
        name: 'Full House',
        category: 'special',
        threshold: 1,
      },
    ];

    it('unlocks the achievement and notifies exactly once (idempotent)', async () => {
      const m = makeMocks(catalog);
      await m.service.awardBySlug(7, 'special-full-house');
      expect(m.notifications.sendToUser).toHaveBeenCalledTimes(1);
      expect(m.notifications.sendToUser).toHaveBeenCalledWith(
        7,
        'achievement_unlocked',
        expect.any(String),
        expect.stringContaining('Full House'),
        expect.any(Object),
      );

      // Second call — already unlocked, no duplicate notification.
      await m.service.awardBySlug(7, 'special-full-house');
      expect(m.notifications.sendToUser).toHaveBeenCalledTimes(1);
    });

    it('is a no-op for an unknown slug', async () => {
      const m = makeMocks(catalog);
      await m.service.awardBySlug(7, 'does-not-exist');
      expect(m.notifications.sendToUser).not.toHaveBeenCalled();
      expect(m.userAchievementRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('checkPointsAchievements', () => {
    const catalog: FakeAchievement[] = [
      { id: 1, slug: 'points-50', name: 'Coffee Lover', category: 'points', threshold: 50 },
      { id: 2, slug: 'points-100', name: 'Penikmat Kopi', category: 'points', threshold: 100 },
      { id: 3, slug: 'points-250', name: 'Anak Kafe Sejati', category: 'points', threshold: 250 },
    ];

    it('unlocks every rung at or below the total, none above it', async () => {
      const m = makeMocks(catalog);
      const unlocked = await m.service.checkPointsAchievements(7, 120);
      expect(unlocked).toEqual(['Coffee Lover', 'Penikmat Kopi']);
      expect(m.notifications.sendToUser).toHaveBeenCalledTimes(2);
      // Progress recorded on the not-yet-unlocked rung too.
      expect(m.store.get(3)).toMatchObject({ progress: 120 });
      expect(m.store.get(3).unlockedAt).toBeUndefined();
    });

    it('does not re-unlock already-unlocked rungs on the next award', async () => {
      const m = makeMocks(catalog);
      await m.service.checkPointsAchievements(7, 60);
      m.notifications.sendToUser.mockClear();
      const unlocked = await m.service.checkPointsAchievements(7, 110);
      expect(unlocked).toEqual(['Penikmat Kopi']);
      expect(m.notifications.sendToUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkTableAchievements', () => {
    const catalog: FakeAchievement[] = [
      { id: 10, slug: 'table-host-1', name: 'Tuan Rumah Pemula', category: 'table', threshold: 1, purposeSlug: 'table_host' },
      { id: 11, slug: 'table-host-5', name: 'Tukang Ngajak', category: 'table', threshold: 5, purposeSlug: 'table_host' },
      { id: 12, slug: 'table-join-1', name: 'Berani Nyapa', category: 'table', threshold: 1, purposeSlug: 'table_join' },
      { id: 13, slug: 'table-squad-1', name: 'Rame-Rame Seru', category: 'table', threshold: 1, purposeSlug: 'table_squad' },
    ];

    it('awards per metric based on the three SQL counts (host/join/squad)', async () => {
      const m = makeMocks(catalog);
      m.dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM cafe_tables WHERE host_user_id'))
          return [{ cnt: '2' }]; // hosted 2 tables
        if (sql.includes('HAVING')) return [{ cnt: '0' }]; // no squad yet
        if (sql.includes('table_join_requests WHERE user_id'))
          return [{ cnt: '1' }]; // joined 1
        return [{ cnt: '0' }];
      });

      const unlocked = await m.service.checkTableAchievements(7);
      expect(unlocked).toContain('Tuan Rumah Pemula'); // host >= 1
      expect(unlocked).toContain('Berani Nyapa'); // join >= 1
      expect(unlocked).not.toContain('Tukang Ngajak'); // host < 5
      expect(unlocked).not.toContain('Rame-Rame Seru'); // squad 0
    });
  });
});
