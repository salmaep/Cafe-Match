import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Checkin } from './entities/checkin.entity';
import { UserStreak } from './entities/user-streak.entity';
import { Cafe } from '../cafes/entities/cafe.entity';
import { CheckInDto, CheckOutDto } from './dto/checkin.dto';
import { AchievementsService } from '../achievements/achievements.service';
import { NotificationsService } from '../notifications/notifications.service';

const RANK_BADGES: Record<number, string> = {
  1: 'Kuncen',
  2: 'Langganan Setia',
  3: 'Reguler Sejati',
};

@Injectable()
export class CheckinsService {
  constructor(
    @InjectRepository(Checkin)
    private readonly checkinRepo: Repository<Checkin>,
    @InjectRepository(UserStreak)
    private readonly streakRepo: Repository<UserStreak>,
    @InjectRepository(Cafe)
    private readonly cafeRepo: Repository<Cafe>,
    private readonly dataSource: DataSource,
    private readonly achievementsService: AchievementsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkIn(userId: number, dto: CheckInDto) {
    // 1. Verify cafe exists
    const cafe = await this.cafeRepo.findOne({ where: { id: dto.cafeId, isActive: true } });
    if (!cafe) throw new NotFoundException('Cafe tidak ditemukan');

    // 2. GPS distance check (300m)
    // DEV TOGGLE: set CHECKIN_SKIP_GPS=true in .env to bypass this check for testing.
    const distance = this.haversineMeters(
      dto.latitude, dto.longitude,
      Number(cafe.latitude), Number(cafe.longitude),
    );
    const skipGps = process.env.CHECKIN_SKIP_GPS === 'true';
    if (!skipGps && distance > 300) {
      throw new BadRequestException(
        `Kamu terlalu jauh dari cafe ini (${Math.round(distance)}m). Maksimal 300m untuk check-in.`,
      );
    }

    // 3. Auto-checkout any active check-in
    const active = await this.checkinRepo.findOne({
      where: { userId, checkOutAt: IsNull() },
    });
    if (active) {
      await this.performCheckout(active);
    }

    // 4. Insert new check-in
    const checkin = this.checkinRepo.create({
      userId,
      cafeId: dto.cafeId,
      verified: true,
    });
    const saved = await this.checkinRepo.save(checkin);

    // 5. Update streaks
    await this.updateStreak(userId, dto.cafeId);

    // 6. Check achievements (general + per-purpose + streak)
    try {
      await this.achievementsService.checkCheckinAchievements(userId);
    } catch (err: any) {
      console.warn('[checkin] achievement check failed:', err?.message);
    }

    // 7. Together detection — notify any friends already at this cafe
    //    + increment together_counts + notify the user themself
    let togetherWith: any[] = [];
    try {
      togetherWith = await this.detectFriendsAtSameCafe(userId, dto.cafeId);
      if (togetherWith.length > 0) {
        for (const friend of togetherWith) {
          // Increment together_counts for this pair at this cafe
          const [a, b] = userId < friend.id ? [userId, friend.id] : [friend.id, userId];
          await this.dataSource.query(
            `INSERT INTO together_counts (user_a_id, user_b_id, cafe_id, count)
             VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE count = count + 1`,
            [a, b, dto.cafeId],
          );

          // Notify BOTH users (together bomb!)
          await this.notificationsService.sendToUser(
            userId,
            'together_bomb',
            'Barengan! 💥',
            `Kamu lagi di ${cafe.name} bareng ${friend.name}!`,
            { friendId: friend.id, cafeId: dto.cafeId, cafeName: cafe.name },
          );
          await this.notificationsService.sendToUser(
            friend.id,
            'together_bomb',
            'Barengan! 💥',
            `${friend.selfName || 'Temanmu'} baru aja check-in di ${cafe.name} — kalian lagi bareng!`,
            { friendId: userId, cafeId: dto.cafeId, cafeName: cafe.name },
          );
        }
      }
    } catch (err: any) {
      console.warn('[checkin] together-bomb check failed:', err?.message);
    }

    return {
      ...saved,
      cafeName: cafe.name,
      distance: Math.round(distance),
      togetherWith: togetherWith.map((f: any) => ({ id: f.id, name: f.name })),
    };
  }

  /**
   * Find friends of the given user who currently have an active check-in
   * at the same cafe (used for Together Bomb).
   */
  private async detectFriendsAtSameCafe(userId: number, cafeId: number) {
    const [selfRow] = await this.dataSource.query(
      `SELECT name FROM users WHERE id = ?`,
      [userId],
    );
    const selfName = selfRow?.name || 'Temanmu';
    const rows: any[] = await this.dataSource.query(
      `SELECT u.id, u.name
       FROM checkins ck
       JOIN users u ON u.id = ck.user_id
       WHERE ck.cafe_id = ?
         AND ck.check_out_at IS NULL
         AND ck.user_id != ?
         AND EXISTS (
           SELECT 1 FROM friendships f
           WHERE (f.user_a_id = ? AND f.user_b_id = ck.user_id)
              OR (f.user_b_id = ? AND f.user_a_id = ck.user_id)
         )`,
      [cafeId, userId, userId, userId],
    );
    return rows.map((r) => ({ ...r, selfName }));
  }

  async checkOut(userId: number, dto: CheckOutDto) {
    let checkin: Checkin | null = null;
    if (dto.checkinId) {
      checkin = await this.checkinRepo.findOne({ where: { id: dto.checkinId, userId } });
    } else if (dto.cafeId) {
      checkin = await this.checkinRepo.findOne({
        where: { userId, cafeId: dto.cafeId, checkOutAt: IsNull() },
      });
    } else {
      checkin = await this.checkinRepo.findOne({
        where: { userId, checkOutAt: IsNull() },
      });
    }
    if (!checkin) throw new NotFoundException('Tidak ada check-in aktif');
    return this.performCheckout(checkin);
  }

  private async performCheckout(checkin: Checkin) {
    checkin.checkOutAt = new Date();
    const diff = checkin.checkOutAt.getTime() - new Date(checkin.checkInAt).getTime();
    checkin.durationMinutes = Math.round(diff / 60000);
    return this.checkinRepo.save(checkin);
  }

  async getActive(userId: number) {
    const checkin = await this.checkinRepo.findOne({
      where: { userId, checkOutAt: IsNull() },
      relations: ['cafe'],
    });
    return checkin || null;
  }

  async history(userId: number, page = 1, limit = 20) {
    const [data, total] = await this.checkinRepo.findAndCount({
      where: { userId },
      relations: ['cafe'],
      order: { checkInAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { page, limit, total } };
  }

  async leaderboard(cafeId: number) {
    // Rank by composite score: visits count (weighted 2x) + total hours (weighted 1x)
    // This rewards both frequent visitors and long-staying regulars.
    const rows: any[] = await this.dataSource.query(
      `SELECT u.id AS userId, u.name, u.avatar_url AS avatarUrl,
              COUNT(c.id) AS checkinCount,
              COALESCE(SUM(c.duration_minutes), 0) AS totalMinutes,
              (COUNT(c.id) * 2 + COALESCE(SUM(c.duration_minutes), 0) / 60) AS score
       FROM checkins c
       JOIN users u ON u.id = c.user_id
       WHERE c.cafe_id = ?
       GROUP BY u.id, u.name, u.avatar_url
       ORDER BY score DESC
       LIMIT 10`,
      [cafeId],
    );
    return rows.map((r, i) => {
      const rank = i + 1;
      const totalMinutes = parseInt(r.totalMinutes, 10);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return {
        rank,
        userId: r.userId,
        name: r.name,
        avatarUrl: r.avatarUrl,
        checkinCount: parseInt(r.checkinCount, 10),
        totalDuration: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
        totalMinutes,
        score: Math.round(parseFloat(r.score) * 10) / 10,
        badge: RANK_BADGES[rank] || (rank <= 10 ? 'Pengunjung Tetap' : null),
      };
    });
  }

  /** Global leaderboard across all cafes */
  async globalLeaderboard() {
    const rows: any[] = await this.dataSource.query(
      `SELECT u.id AS userId, u.name, u.avatar_url AS avatarUrl,
              COUNT(c.id) AS totalCheckins,
              COUNT(DISTINCT c.cafe_id) AS uniqueCafes,
              COALESCE(SUM(c.duration_minutes), 0) AS totalMinutes,
              (COUNT(c.id) * 2 + COUNT(DISTINCT c.cafe_id) * 5 + COALESCE(SUM(c.duration_minutes), 0) / 60) AS score
       FROM checkins c
       JOIN users u ON u.id = c.user_id
       GROUP BY u.id, u.name, u.avatar_url
       ORDER BY score DESC
       LIMIT 20`,
    );
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.name,
      avatarUrl: r.avatarUrl,
      totalCheckins: parseInt(r.totalCheckins, 10),
      uniqueCafes: parseInt(r.uniqueCafes, 10),
      totalMinutes: parseInt(r.totalMinutes, 10),
      totalDuration:
        Math.floor(parseInt(r.totalMinutes, 10) / 60) > 0
          ? `${Math.floor(parseInt(r.totalMinutes, 10) / 60)}h ${parseInt(r.totalMinutes, 10) % 60}m`
          : `${parseInt(r.totalMinutes, 10)}m`,
      score: Math.round(parseFloat(r.score) * 10) / 10,
    }));
  }

  async getStreak(userId: number) {
    const global = await this.streakRepo.findOne({
      where: { userId, streakType: 'global' },
    });
    const now = new Date();
    const isActive = global
      ? this.daysBetween(new Date(global.lastCheckinDate), now) <= 7
      : false;

    return {
      current: global?.currentStreak || 0,
      longest: global?.longestStreak || 0,
      active: isActive,
      lastCheckinDate: global?.lastCheckinDate || null,
    };
  }

  async autoCheckoutStale() {
    const result = await this.dataSource.query(
      `UPDATE checkins
       SET check_out_at = NOW(),
           duration_minutes = TIMESTAMPDIFF(MINUTE, check_in_at, NOW())
       WHERE check_out_at IS NULL
         AND check_in_at < DATE_SUB(NOW(), INTERVAL 4 HOUR)`,
    );
    return result.affectedRows || 0;
  }

  // ── Helpers ──

  private async updateStreak(userId: number, cafeId: number) {
    const today = new Date().toISOString().split('T')[0];

    // Global streak
    await this.upsertStreak(userId, null, 'global', today);
    // Per-cafe streak
    await this.upsertStreak(userId, cafeId, 'cafe', today);
  }

  private async upsertStreak(
    userId: number,
    cafeId: number | null,
    streakType: string,
    today: string,
  ) {
    let streak = await this.streakRepo.findOne({
      where: { userId, cafeId: cafeId as any, streakType },
    });

    if (!streak) {
      streak = this.streakRepo.create({
        userId,
        cafeId: cafeId as any,
        streakType,
        currentStreak: 1,
        longestStreak: 1,
        lastCheckinDate: today,
      });
    } else {
      const days = this.daysBetween(new Date(streak.lastCheckinDate), new Date(today));
      if (days === 0) {
        // Same day — no increment
        return this.streakRepo.save(streak);
      } else if (days <= 7) {
        streak.currentStreak += 1;
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
      } else if (days > 14) {
        streak.currentStreak = 1; // reset
      }
      // 7 < days <= 14: streak frozen, not lost yet — no change
      streak.lastCheckinDate = today;
    }
    return this.streakRepo.save(streak);
  }

  private daysBetween(a: Date, b: Date): number {
    const msPerDay = 86400000;
    return Math.floor(Math.abs(b.getTime() - a.getTime()) / msPerDay);
  }

  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
