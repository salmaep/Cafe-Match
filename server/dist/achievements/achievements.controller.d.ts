import { AchievementsService } from './achievements.service';
export declare class AchievementsController {
    private readonly achievementsService;
    constructor(achievementsService: AchievementsService);
    findAll(): Promise<import("./entities/achievement.entity").Achievement[]>;
    myAchievements(user: any): Promise<{
        progress: number;
        unlocked: boolean;
        unlockedAt: Date | null;
        id: number;
        slug: string;
        name: string;
        description: string;
        category: string;
        tier: string;
        threshold: number;
        purposeSlug: string;
        iconUrl: string;
    }[]>;
    userAchievements(userId: number): Promise<import("./entities/user-achievement.entity").UserAchievement[]>;
}
