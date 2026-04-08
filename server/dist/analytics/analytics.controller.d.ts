import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    trackEvent(body: {
        cafeId: number;
        eventType: string;
        promotionId?: number;
    }): Promise<{
        tracked: boolean;
    }>;
    getSummary(cafeId: number, days?: string): Promise<any>;
}
