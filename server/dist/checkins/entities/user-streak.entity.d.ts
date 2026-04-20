import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';
export declare class UserStreak {
    id: number;
    userId: number;
    cafeId: number;
    streakType: string;
    currentStreak: number;
    longestStreak: number;
    lastCheckinDate: string;
    user: User;
    cafe: Cafe;
}
