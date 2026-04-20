import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FriendRequest } from './entities/friend-request.entity';
import { Friendship } from './entities/friendship.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(FriendRequest)
    private readonly requestRepo: Repository<FriendRequest>,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async sendRequest(senderId: number, friendCode: string) {
    const receiver = await this.userRepo.findOne({ where: { friendCode } });
    if (!receiver) throw new NotFoundException('Kode teman tidak ditemukan');
    if (receiver.id === senderId) throw new BadRequestException('Gak bisa add diri sendiri dong');

    // Check if already friends
    const [a, b] = senderId < receiver.id ? [senderId, receiver.id] : [receiver.id, senderId];
    const existing = await this.friendshipRepo.findOne({ where: { userAId: a, userBId: b } });
    if (existing) throw new ConflictException('Kalian sudah berteman');

    // Check if request already exists
    const existingReq = await this.requestRepo.findOne({
      where: [
        { senderId, receiverId: receiver.id },
        { senderId: receiver.id, receiverId: senderId },
      ],
    });
    if (existingReq) {
      if (existingReq.status === 'pending') throw new ConflictException('Request sudah dikirim');
      if (existingReq.status === 'accepted') throw new ConflictException('Kalian sudah berteman');
    }

    const request = this.requestRepo.create({ senderId, receiverId: receiver.id });
    const saved = await this.requestRepo.save(request);

    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    await this.notificationsService.sendToUser(
      receiver.id,
      'friend_request',
      'Permintaan Pertemanan',
      `${sender?.name || 'Seseorang'} mau jadi temen kamu di CafeMatch!`,
      { requestId: saved.id, senderId },
    );

    return saved;
  }

  async acceptRequest(userId: number, requestId: number) {
    const request = await this.requestRepo.findOne({ where: { id: requestId, receiverId: userId, status: 'pending' } });
    if (!request) throw new NotFoundException('Request tidak ditemukan');

    request.status = 'accepted';
    await this.requestRepo.save(request);

    // Create friendship (enforce user_a_id < user_b_id)
    const [a, b] = request.senderId < request.receiverId
      ? [request.senderId, request.receiverId]
      : [request.receiverId, request.senderId];

    await this.friendshipRepo.save(this.friendshipRepo.create({ userAId: a, userBId: b }));

    // Notify the sender
    const accepter = await this.userRepo.findOne({ where: { id: userId } });
    await this.notificationsService.sendToUser(
      request.senderId,
      'friend_request',
      'Permintaan Diterima!',
      `${accepter?.name || 'Seseorang'} menerima permintaan pertemanan kamu!`,
      { friendId: userId },
    );

    // Trigger social achievements for BOTH users (both just gained a friend)
    try {
      const [senderCount, receiverCount] = await Promise.all([
        this.friendCount(request.senderId),
        this.friendCount(request.receiverId),
      ]);
      await this.achievementsService.checkSocialAchievements(
        request.senderId,
        'friends',
        senderCount,
      );
      await this.achievementsService.checkSocialAchievements(
        request.receiverId,
        'friends',
        receiverCount,
      );
    } catch (err: any) {
      console.warn('[friends] achievement check failed:', err?.message);
    }

    return { message: 'Berhasil berteman!' };
  }

  async rejectRequest(userId: number, requestId: number) {
    const request = await this.requestRepo.findOne({ where: { id: requestId, receiverId: userId, status: 'pending' } });
    if (!request) throw new NotFoundException('Request tidak ditemukan');
    request.status = 'rejected';
    await this.requestRepo.save(request);
    return { message: 'Request ditolak' };
  }

  async pendingRequests(userId: number) {
    return this.requestRepo.find({
      where: { receiverId: userId, status: 'pending' },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });
  }

  async friendList(userId: number) {
    const rows: any[] = await this.dataSource.query(
      `SELECT u.id, u.name, u.email, u.friend_code AS friendCode, u.avatar_url AS avatarUrl
       FROM friendships f
       JOIN users u ON (u.id = f.user_a_id OR u.id = f.user_b_id) AND u.id != ?
       WHERE f.user_a_id = ? OR f.user_b_id = ?`,
      [userId, userId, userId],
    );
    return rows;
  }

  /** Friends currently checked in — used for map overlay */
  async friendsOnMap(userId: number) {
    const rows: any[] = await this.dataSource.query(
      `SELECT u.id, u.name, u.avatar_url AS avatarUrl,
              c.id AS cafeId, c.name AS cafeName, c.latitude, c.longitude,
              ck.check_in_at AS checkInAt
       FROM friendships f
       JOIN users u ON (u.id = f.user_a_id OR u.id = f.user_b_id) AND u.id != ?
       JOIN checkins ck ON ck.user_id = u.id AND ck.check_out_at IS NULL
       JOIN cafes c ON c.id = ck.cafe_id
       WHERE f.user_a_id = ? OR f.user_b_id = ?`,
      [userId, userId, userId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatarUrl,
      currentCafe: {
        id: r.cafeId,
        name: r.cafeName,
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
      },
      checkInAt: r.checkInAt,
    }));
  }

  /** Check if any friends are at the same cafe (for Together Bomb) */
  async friendsAtCafe(userId: number, cafeId: number): Promise<number[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT ck.user_id AS friendId
       FROM friendships f
       JOIN users u ON (u.id = f.user_a_id OR u.id = f.user_b_id) AND u.id != ?
       JOIN checkins ck ON ck.user_id = u.id AND ck.check_out_at IS NULL AND ck.cafe_id = ?
       WHERE f.user_a_id = ? OR f.user_b_id = ?`,
      [userId, cafeId, userId, userId],
    );
    return rows.map((r) => r.friendId);
  }

  async friendCount(userId: number): Promise<number> {
    const [{ cnt }] = await this.dataSource.query(
      `SELECT COUNT(*) AS cnt FROM friendships WHERE user_a_id = ? OR user_b_id = ?`,
      [userId, userId],
    );
    return parseInt(cnt, 10);
  }

  /**
   * Send an emoji "throw" to a friend.
   * Creates an emoji_spam notification. The client's socket gateway can
   * relay it in real-time if the target user is connected.
   */
  async throwEmoji(senderId: number, targetFriendId: number, emoji: string) {
    // Verify friendship exists
    const [a, b] = senderId < targetFriendId
      ? [senderId, targetFriendId]
      : [targetFriendId, senderId];
    const friendship = await this.friendshipRepo.findOne({
      where: { userAId: a, userBId: b },
    });
    if (!friendship) throw new BadRequestException('Kalian belum berteman');

    const sender = await this.userRepo.findOne({ where: { id: senderId } });

    // Notify the target user (persistent + push)
    await this.notificationsService.sendToUser(
      targetFriendId,
      'emoji_spam',
      `${sender?.name || 'Seorang teman'} kirim ${emoji}!`,
      `Kamu dapet emoji ${emoji} dari ${sender?.name || 'temanmu'}`,
      {
        senderId,
        senderName: sender?.name || 'Unknown',
        emoji,
        timestamp: Date.now(),
      },
    );

    return { message: 'Emoji sent!', emoji };
  }
}
