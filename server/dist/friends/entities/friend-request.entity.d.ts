import { User } from '../../users/entities/user.entity';
export declare class FriendRequest {
    id: number;
    senderId: number;
    receiverId: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    sender: User;
    receiver: User;
}
