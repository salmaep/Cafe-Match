import { Repository, DataSource } from 'typeorm';
import { CafeAnalytics } from './entities/cafe-analytics.entity';
export declare class AnalyticsService {
    private readonly analyticsRepo;
    private readonly dataSource;
    constructor(analyticsRepo: Repository<CafeAnalytics>, dataSource: DataSource);
    trackEvent(cafeId: number, eventType: string, promotionId?: number): Promise<{
        tracked: boolean;
    }>;
    getSummary(cafeId: number, days?: number): Promise<any>;
}
