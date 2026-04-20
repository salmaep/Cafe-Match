import { User } from '../../users/entities/user.entity';
export declare class Friendship {
    id: number;
    userAId: number;
    userBId: number;
    createdAt: Date;
    userA: User;
    userB: User;
}
