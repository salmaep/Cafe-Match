import { User } from '../../users/entities/user.entity';
import { Achievement } from './achievement.entity';
export declare class UserAchievement {
    id: number;
    userId: number;
    achievementId: number;
    progress: number;
    unlockedAt: Date;
    user: User;
    achievement: Achievement;
}
