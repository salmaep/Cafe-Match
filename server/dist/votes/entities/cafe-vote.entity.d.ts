import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';
import { Purpose } from '../../purposes/entities/purpose.entity';
export declare class CafeVote {
    id: number;
    userId: number;
    cafeId: number;
    purposeId: number;
    createdAt: Date;
    user: User;
    cafe: Cafe;
    purpose: Purpose;
}
