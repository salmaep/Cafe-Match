import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';
export declare class Favorite {
    id: number;
    userId: number;
    cafeId: number;
    createdAt: Date;
    user: User;
    cafe: Cafe;
}
