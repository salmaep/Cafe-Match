import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';
export declare class Checkin {
    id: number;
    userId: number;
    cafeId: number;
    checkInAt: Date;
    checkOutAt: Date;
    durationMinutes: number;
    verified: boolean;
    user: User;
    cafe: Cafe;
}
