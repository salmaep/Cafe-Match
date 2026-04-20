import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/events', cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, Set<string>>();

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (userId) {
      client.join(`user:${userId}`);
      if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
      this.userSockets.get(userId)!.add(client.id);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.extractUserId(client);
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
    }
  }

  @SubscribeMessage('emoji:send')
  handleEmojiSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: number; emoji: string },
  ) {
    this.server.to(`user:${data.targetUserId}`).emit('emoji:receive', {
      fromUserId: this.extractUserId(client),
      emoji: data.emoji,
      timestamp: Date.now(),
    });
  }

  /** Server-side trigger for Together Bomb */
  emitTogetherBomb(userIds: number[], cafeId: number, cafeName: string) {
    for (const id of userIds) {
      this.server.to(`user:${id}`).emit('together:bomb', {
        cafeId,
        cafeName,
        userIds,
        timestamp: Date.now(),
      });
    }
  }

  /** Server-side trigger: send event to specific user */
  emitToUser(userId: number, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  private extractUserId(client: Socket): number | null {
    // userId passed as query param on connect: ?userId=123
    const id = client.handshake.query.userId;
    return id ? parseInt(id as string, 10) : null;
  }
}
