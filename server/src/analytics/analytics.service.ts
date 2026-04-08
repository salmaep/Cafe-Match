import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CafeAnalytics } from './entities/cafe-analytics.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(CafeAnalytics)
    private readonly analyticsRepo: Repository<CafeAnalytics>,
    private readonly dataSource: DataSource,
  ) {}

  async trackEvent(cafeId: number, eventType: string, promotionId?: number) {
    const event = this.analyticsRepo.create({
      cafeId,
      eventType,
      promotionId: promotionId || null,
    } as Partial<CafeAnalytics>);
    await this.analyticsRepo.save(event);
    return { tracked: true };
  }

  async getSummary(cafeId: number, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await this.dataSource.query(
      `SELECT
        DATE(created_at) AS date,
        event_type AS eventType,
        COUNT(*) AS count
       FROM cafe_analytics
       WHERE cafe_id = ? AND created_at >= ?
       GROUP BY DATE(created_at), event_type
       ORDER BY date ASC`,
      [cafeId, since],
    );

    return results.map((r: any) => ({
      date: r.date,
      eventType: r.eventType,
      count: Number(r.count),
    }));
  }
}
