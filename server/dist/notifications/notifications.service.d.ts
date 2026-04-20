import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { PushToken } from './entities/push-token.entity';
export declare class NotificationsService {
    private readonly notifRepo;
    private readonly tokenRepo;
    constructor(notifRepo: Repository<Notification>, tokenRepo: Repository<PushToken>);
    sendToUser(userId: number, type: string, title: string, body: string, data?: any): Promise<Notification>;
    sendToUsers(userIds: number[], type: string, title: string, body: string, data?: any): Promise<void>;
    list(userId: number, page?: number, limit?: number): Promise<{
        data: Notification[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    unreadCount(userId: number): Promise<number>;
    markRead(userId: number, notifId: number): Promise<void>;
    markAllRead(userId: number): Promise<void>;
    registerToken(userId: number, token: string, platform: string): Promise<PushToken>;
    private sendExpoPush;
}
