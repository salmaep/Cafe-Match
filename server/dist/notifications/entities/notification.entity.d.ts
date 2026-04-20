import { User } from '../../users/entities/user.entity';
export declare class Notification {
    id: number;
    userId: number;
    type: string;
    title: string;
    body: string;
    data: any;
    isRead: boolean;
    createdAt: Date;
    user: User;
}
