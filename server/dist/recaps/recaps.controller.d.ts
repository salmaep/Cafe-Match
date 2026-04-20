import { RecapsService } from './recaps.service';
declare class GenerateRecapDto {
    year: number;
}
export declare class RecapsController {
    private readonly recapsService;
    constructor(recapsService: RecapsService);
    getRecap(user: any, year: number): Promise<import("./entities/user-recap.entity").UserRecap | null>;
    generate(user: any, dto: GenerateRecapDto): Promise<{
        yearTitle: string;
        totalCheckins: number;
        totalCafesVisited: number;
        totalDurationHours: number;
        topCafes: any;
        topPurpose: any;
        totalReviews: number;
        achievementsUnlocked: number;
        friendsMade: number;
        longestStreak: any;
        favoriteDay: any;
        averageSessionMinutes: number;
    }>;
}
export {};
