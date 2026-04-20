import { Repository, DataSource } from 'typeorm';
import { Checkin } from './entities/checkin.entity';
import { UserStreak } from './entities/user-streak.entity';
import { Cafe } from '../cafes/entities/cafe.entity';
import { CheckInDto, CheckOutDto } from './dto/checkin.dto';
import { AchievementsService } from '../achievements/achievements.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class CheckinsService {
    private readonly checkinRepo;
    private readonly streakRepo;
    private readonly cafeRepo;
    private readonly dataSource;
    private readonly achievementsService;
    private readonly notificationsService;
    constructor(checkinRepo: Repository<Checkin>, streakRepo: Repository<UserStreak>, cafeRepo: Repository<Cafe>, dataSource: DataSource, achievementsService: AchievementsService, notificationsService: NotificationsService);
    checkIn(userId: number, dto: CheckInDto): Promise<{
        cafeName: string;
        distance: number;
        togetherWith: {
            id: any;
            name: any;
        }[];
        id: number;
        userId: number;
        cafeId: number;
        checkInAt: Date;
        checkOutAt: Date;
        durationMinutes: number;
        verified: boolean;
        user: import("../users/entities/user.entity").User;
        cafe: Cafe;
    }>;
    private detectFriendsAtSameCafe;
    checkOut(userId: number, dto: CheckOutDto): Promise<Checkin>;
    private performCheckout;
    getActive(userId: number): Promise<Checkin | null>;
    history(userId: number, page?: number, limit?: number): Promise<{
        data: Checkin[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    leaderboard(cafeId: number): Promise<{
        rank: number;
        userId: any;
        name: any;
        avatarUrl: any;
        checkinCount: number;
        totalDuration: string;
        totalMinutes: number;
        score: number;
        badge: string | null;
    }[]>;
    globalLeaderboard(): Promise<{
        rank: number;
        userId: any;
        name: any;
        avatarUrl: any;
        totalCheckins: number;
        uniqueCafes: number;
        totalMinutes: number;
        totalDuration: string;
        score: number;
    }[]>;
    getStreak(userId: number): Promise<{
        current: number;
        longest: number;
        active: boolean;
        lastCheckinDate: string | null;
    }>;
    autoCheckoutStale(): Promise<any>;
    private updateStreak;
    private upsertStreak;
    private daysBetween;
    private haversineMeters;
}
