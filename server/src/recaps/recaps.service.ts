import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserRecap } from './entities/user-recap.entity';

@Injectable()
export class RecapsService {
  constructor(
    @InjectRepository(UserRecap)
    private readonly recapRepo: Repository<UserRecap>,
    private readonly dataSource: DataSource,
  ) {}

  async getRecap(userId: number, year: number) {
    return this.recapRepo.findOne({ where: { userId, year } });
  }

  async generateRecap(userId: number, year: number) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31 23:59:59`;

    // 1. Total check-ins
    const [{ totalCheckins }] = await this.dataSource.query(
      `SELECT COUNT(*) AS totalCheckins FROM checkins WHERE user_id = ? AND check_in_at BETWEEN ? AND ?`,
      [userId, start, end],
    );

    // 2. Distinct cafes
    const [{ totalCafes }] = await this.dataSource.query(
      `SELECT COUNT(DISTINCT cafe_id) AS totalCafes FROM checkins WHERE user_id = ? AND check_in_at BETWEEN ? AND ?`,
      [userId, start, end],
    );

    // 3. Total duration
    const [{ totalMinutes }] = await this.dataSource.query(
      `SELECT COALESCE(SUM(duration_minutes), 0) AS totalMinutes FROM checkins WHERE user_id = ? AND check_in_at BETWEEN ? AND ?`,
      [userId, start, end],
    );

    // 4. Top 5 cafes
    const topCafes = await this.dataSource.query(
      `SELECT c.id AS cafeId, c.name, COUNT(ck.id) AS visits,
              (SELECT ph.url FROM cafe_photos ph WHERE ph.cafe_id = c.id AND ph.is_primary = TRUE LIMIT 1) AS photo
       FROM checkins ck JOIN cafes c ON c.id = ck.cafe_id
       WHERE ck.user_id = ? AND ck.check_in_at BETWEEN ? AND ?
       GROUP BY c.id, c.name ORDER BY visits DESC LIMIT 5`,
      [userId, start, end],
    );

    // 5. Top purpose (most-visited purpose category)
    const purposeRows = await this.dataSource.query(
      `SELECT p.name, COUNT(DISTINCT ck.cafe_id) AS cnt
       FROM checkins ck
       JOIN cafe_facilities cf ON cf.cafe_id = ck.cafe_id
       JOIN purpose_requirements pr ON pr.facility_key = cf.facility_key AND pr.is_mandatory = TRUE
       JOIN purposes p ON p.id = pr.purpose_id
       WHERE ck.user_id = ? AND ck.check_in_at BETWEEN ? AND ?
       GROUP BY p.name ORDER BY cnt DESC LIMIT 1`,
      [userId, start, end],
    );
    const topPurpose = purposeRows[0]?.name || 'Cafe Explorer';

    // 6. Total reviews
    const [{ totalReviews }] = await this.dataSource.query(
      `SELECT COUNT(*) AS totalReviews FROM reviews WHERE user_id = ? AND created_at BETWEEN ? AND ?`,
      [userId, start, end],
    );

    // 7. Achievements unlocked
    const [{ achievementsUnlocked }] = await this.dataSource.query(
      `SELECT COUNT(*) AS achievementsUnlocked FROM user_achievements WHERE user_id = ? AND unlocked_at BETWEEN ? AND ?`,
      [userId, start, end],
    );

    // 8. Friends made
    const [{ friendsMade }] = await this.dataSource.query(
      `SELECT COUNT(*) AS friendsMade FROM friendships WHERE (user_a_id = ? OR user_b_id = ?) AND created_at BETWEEN ? AND ?`,
      [userId, userId, start, end],
    );

    // 9. Longest streak
    const [streakRow] = await this.dataSource.query(
      `SELECT COALESCE(MAX(longest_streak), 0) AS longestStreak FROM user_streaks WHERE user_id = ? AND streak_type = 'global'`,
      [userId],
    );

    // 10. Favorite day of week
    const dayRows = await this.dataSource.query(
      `SELECT DAYNAME(check_in_at) AS dayName, COUNT(*) AS cnt
       FROM checkins WHERE user_id = ? AND check_in_at BETWEEN ? AND ?
       GROUP BY dayName ORDER BY cnt DESC LIMIT 1`,
      [userId, start, end],
    );

    // 11. Average session
    const [{ avgSession }] = await this.dataSource.query(
      `SELECT COALESCE(AVG(duration_minutes), 0) AS avgSession FROM checkins WHERE user_id = ? AND duration_minutes IS NOT NULL AND check_in_at BETWEEN ? AND ?`,
      [userId, start, end],
    );

    // Year title
    const yearTitle = this.computeYearTitle(
      topPurpose,
      parseInt(totalCheckins, 10),
      dayRows[0]?.dayName,
    );

    const recapData = {
      yearTitle,
      totalCheckins: parseInt(totalCheckins, 10),
      totalCafesVisited: parseInt(totalCafes, 10),
      totalDurationHours: Math.round(parseInt(totalMinutes, 10) / 60),
      topCafes: topCafes.map((c: any) => ({
        cafeId: c.cafeId,
        name: c.name,
        visits: parseInt(c.visits, 10),
        photo: c.photo || null,
      })),
      topPurpose,
      totalReviews: parseInt(totalReviews, 10),
      achievementsUnlocked: parseInt(achievementsUnlocked, 10),
      friendsMade: parseInt(friendsMade, 10),
      longestStreak: streakRow?.longestStreak || 0,
      favoriteDay: dayRows[0]?.dayName || 'N/A',
      averageSessionMinutes: Math.round(parseFloat(avgSession)),
    };

    // Upsert
    let recap = await this.recapRepo.findOne({ where: { userId, year } });
    if (recap) {
      recap.recapData = recapData;
      recap.generatedAt = new Date();
    } else {
      recap = this.recapRepo.create({ userId, year, recapData });
    }
    await this.recapRepo.save(recap);
    return recapData;
  }

  private computeYearTitle(topPurpose: string, totalCheckins: number, favDay?: string): string {
    const purposeMap: Record<string, string> = {
      'Work from Cafe': 'Si Pekerja Kafe',
      'Me Time': 'Petualang Me Time',
      'Date': 'Si Romantis Kafe',
      'Family Time': 'Family Cafe Explorer',
      'Group Work / Study': 'Si Rajin Belajar',
    };
    if (totalCheckins >= 200) return 'Kafe Addict Sejati';
    if (totalCheckins >= 100) return 'Legenda Nongkrong';
    if (purposeMap[topPurpose]) return purposeMap[topPurpose];
    if (favDay === 'Saturday' || favDay === 'Sunday') return 'Weekend Cafe Hunter';
    return `Pecinta Kafe ${new Date().getFullYear()}`;
  }
}
