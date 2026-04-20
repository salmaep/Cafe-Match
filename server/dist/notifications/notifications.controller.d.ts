import { NotificationsService } from './notifications.service';
declare class RegisterTokenDto {
    token: string;
    platform: string;
}
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    list(user: any, page?: number, limit?: number): Promise<{
        data: import("./entities/notification.entity").Notification[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    unreadCount(user: any): Promise<number>;
    markRead(user: any, id: number): Promise<void>;
    markAllRead(user: any): Promise<void>;
    registerToken(user: any, dto: RegisterTokenDto): Promise<import("./entities/push-token.entity").PushToken>;
}
export {};
