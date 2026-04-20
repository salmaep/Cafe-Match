import { Repository, DataSource } from 'typeorm';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AchievementsService {
    private readonly achievementRepo;
    private readonly userAchievementRepo;
    private readonly dataSource;
    private readonly notificationsService;
    constructor(achievementRepo: Repository<Achievement>, userAchievementRepo: Repository<UserAchievement>, dataSource: DataSource, notificationsService: NotificationsService);
    findAll(): Promise<Achievement[]>;
    findByUser(userId: number): Promise<{
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
    findPublicByUser(userId: number): Promise<UserAchievement[]>;
    checkCheckinAchievements(userId: number): Promise<string[]>;
    checkSocialAchievements(userId: number, metric: 'friends' | 'reviews', count: number): Promise<string[]>;
    private checkAndAward;
    private awardIfNew;
}
