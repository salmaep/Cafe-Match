import { Repository, DataSource } from 'typeorm';
import { FriendRequest } from './entities/friend-request.entity';
import { Friendship } from './entities/friendship.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';
export declare class FriendsService {
    private readonly requestRepo;
    private readonly friendshipRepo;
    private readonly userRepo;
    private readonly dataSource;
    private readonly notificationsService;
    private readonly achievementsService;
    constructor(requestRepo: Repository<FriendRequest>, friendshipRepo: Repository<Friendship>, userRepo: Repository<User>, dataSource: DataSource, notificationsService: NotificationsService, achievementsService: AchievementsService);
    sendRequest(senderId: number, friendCode: string): Promise<FriendRequest>;
    acceptRequest(userId: number, requestId: number): Promise<{
        message: string;
    }>;
    rejectRequest(userId: number, requestId: number): Promise<{
        message: string;
    }>;
    pendingRequests(userId: number): Promise<FriendRequest[]>;
    friendList(userId: number): Promise<any[]>;
    friendsOnMap(userId: number): Promise<{
        id: any;
        name: any;
        avatarUrl: any;
        currentCafe: {
            id: any;
            name: any;
            latitude: number;
            longitude: number;
        };
        checkInAt: any;
    }[]>;
    friendsAtCafe(userId: number, cafeId: number): Promise<number[]>;
    friendCount(userId: number): Promise<number>;
    throwEmoji(senderId: number, targetFriendId: number, emoji: string): Promise<{
        message: string;
        emoji: string;
    }>;
}
