import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private userSockets;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleEmojiSend(client: Socket, data: {
        targetUserId: number;
        emoji: string;
    }): void;
    emitTogetherBomb(userIds: number[], cafeId: number, cafeName: string): void;
    emitToUser(userId: number, event: string, data: any): void;
    private extractUserId;
}
