import { CheckinsService } from './checkins.service';
import { CheckInDto, CheckOutDto } from './dto/checkin.dto';
export declare class CheckinsController {
    private readonly checkinsService;
    constructor(checkinsService: CheckinsService);
    checkIn(user: any, dto: CheckInDto): Promise<{
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
        cafe: import("../cafes/entities/cafe.entity").Cafe;
    }>;
    checkOut(user: any, dto: CheckOutDto): Promise<import("./entities/checkin.entity").Checkin>;
    getActive(user: any): Promise<import("./entities/checkin.entity").Checkin | null>;
    history(user: any, page?: number, limit?: number): Promise<{
        data: import("./entities/checkin.entity").Checkin[];
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
    streak(user: any): Promise<{
        current: number;
        longest: number;
        active: boolean;
        lastCheckinDate: string | null;
    }>;
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
}
