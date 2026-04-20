import { Repository, DataSource } from 'typeorm';
import { UserRecap } from './entities/user-recap.entity';
export declare class RecapsService {
    private readonly recapRepo;
    private readonly dataSource;
    constructor(recapRepo: Repository<UserRecap>, dataSource: DataSource);
    getRecap(userId: number, year: number): Promise<UserRecap | null>;
    generateRecap(userId: number, year: number): Promise<{
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
    private computeYearTitle;
}
