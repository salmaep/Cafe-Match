import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepo: Repository<UserAchievement>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll() {
    return this.achievementRepo.find({ order: { category: 'ASC', threshold: 'ASC' } });
  }

  async findByUser(userId: number) {
    const achievements = await this.achievementRepo.find();
    const userAchievements = await this.userAchievementRepo.find({ where: { userId } });
    const uaMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]));

    return achievements.map((a) => {
      const ua = uaMap.get(a.id);
      return {
        ...a,
        progress: ua?.progress || 0,
        unlocked: !!ua?.unlockedAt,
        unlockedAt: ua?.unlockedAt || null,
      };
    });
  }

  async findPublicByUser(userId: number) {
    return this.userAchievementRepo.find({
      where: { userId },
      relations: ['achievement'],
      order: { unlockedAt: 'DESC' },
    });
  }

  /**
   * Check and award achievements after a check-in.
   * Called by CheckinsService after every successful check-in.
   */
  async checkCheckinAchievements(userId: number) {
    const newlyUnlocked: string[] = [];

    // 1. Total check-in count
    const [{ total }] = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM checkins WHERE user_id = ?`,
      [userId],
    );
    const totalCount = parseInt(total, 10);
    await this.checkAndAward(userId, 'visit_general', null, totalCount, newlyUnlocked);

    // 2. Per-purpose monthly counts (distinct cafes visited per purpose this month)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const purposeCounts: { purpose_slug: string; cnt: string }[] = await this.dataSource.query(
      `SELECT pr.purpose_slug, COUNT(DISTINCT ck.cafe_id) AS cnt
       FROM checkins ck
       JOIN cafe_facilities cf ON cf.cafe_id = ck.cafe_id
       JOIN purpose_requirements pr2 ON pr2.facility_key = cf.facility_key AND pr2.is_mandatory = TRUE
       JOIN purposes p ON p.id = pr2.purpose_id
       JOIN (SELECT DISTINCT slug AS purpose_slug FROM purposes) pr ON pr.purpose_slug = p.slug
       WHERE ck.user_id = ? AND ck.check_in_at >= ?
       GROUP BY pr.purpose_slug`,
      [userId, monthStart.toISOString().split('T')[0]],
    );

    for (const pc of purposeCounts) {
      await this.checkAndAward(
        userId,
        'visit_purpose',
        pc.purpose_slug,
        parseInt(pc.cnt, 10),
        newlyUnlocked,
      );
    }

    // 3. Streak achievements
    const [streakRow] = await this.dataSource.query(
      `SELECT longest_streak FROM user_streaks WHERE user_id = ? AND streak_type = 'global'`,
      [userId],
    );
    if (streakRow) {
      await this.checkAndAward(userId, 'streak', null, streakRow.longest_streak, newlyUnlocked);
    }

    return newlyUnlocked;
  }

  /** Check social achievements (friends count, reviews count) */
  async checkSocialAchievements(userId: number, metric: 'friends' | 'reviews', count: number) {
    const newlyUnlocked: string[] = [];
    // Social achievements use category 'social' and no purpose_slug
    // Map metric to specific achievement slugs
    const achievements = await this.achievementRepo.find({ where: { category: 'social' } });
    for (const a of achievements) {
      const matches =
        (metric === 'friends' && a.slug.includes('friend')) ||
        (metric === 'reviews' && a.slug.includes('review'));
      if (!matches) continue;
      if (count >= a.threshold) {
        await this.awardIfNew(userId, a.id, count, newlyUnlocked, a.name);
      }
    }
    return newlyUnlocked;
  }

  private async checkAndAward(
    userId: number,
    category: string,
    purposeSlug: string | null,
    currentCount: number,
    newlyUnlocked: string[],
  ) {
    const where: any = { category };
    if (purposeSlug) where.purposeSlug = purposeSlug;

    const achievements = await this.achievementRepo.find({ where });
    for (const a of achievements) {
      await this.awardIfNew(userId, a.id, currentCount, newlyUnlocked, a.name);
    }
  }

  private async awardIfNew(
    userId: number,
    achievementId: number,
    progress: number,
    newlyUnlocked: string[],
    achievementName: string,
  ) {
    let ua = await this.userAchievementRepo.findOne({
      where: { userId, achievementId },
    });

    const achievement = await this.achievementRepo.findOne({ where: { id: achievementId } });
    if (!achievement) return;

    if (!ua) {
      ua = this.userAchievementRepo.create({ userId, achievementId, progress: 0 });
    }

    ua.progress = progress;

    if (!ua.unlockedAt && progress >= achievement.threshold) {
      ua.unlockedAt = new Date();
      newlyUnlocked.push(achievementName);

      // Send notification
      await this.notificationsService.sendToUser(
        userId,
        'achievement_unlocked',
        'Achievement Unlocked! 🏆',
        `Selamat! Kamu dapat "${achievementName}"`,
        { achievementId },
      );
    }

    await this.userAchievementRepo.save(ua);
  }
}
