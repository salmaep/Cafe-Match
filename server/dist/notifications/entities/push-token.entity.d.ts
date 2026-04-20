import { User } from '../../users/entities/user.entity';
export declare class PushToken {
    id: number;
    userId: number;
    token: string;
    platform: string;
    createdAt: Date;
    user: User;
}
