import { FriendsService } from './friends.service';
declare class SendRequestDto {
    friendCode: string;
}
declare class ThrowEmojiDto {
    emoji: string;
}
export declare class FriendsController {
    private readonly friendsService;
    constructor(friendsService: FriendsService);
    sendRequest(user: any, dto: SendRequestDto): Promise<import("./entities/friend-request.entity").FriendRequest>;
    accept(user: any, id: number): Promise<{
        message: string;
    }>;
    reject(user: any, id: number): Promise<{
        message: string;
    }>;
    pending(user: any): Promise<import("./entities/friend-request.entity").FriendRequest[]>;
    list(user: any): Promise<any[]>;
    map(user: any): Promise<{
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
    throwEmoji(user: any, friendId: number, dto: ThrowEmojiDto): Promise<{
        message: string;
        emoji: string;
    }>;
}
export {};
