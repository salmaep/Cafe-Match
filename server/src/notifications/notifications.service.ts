import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { PushToken } from './entities/push-token.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(PushToken)
    private readonly tokenRepo: Repository<PushToken>,
  ) {}

  /** Create in-app notification + attempt push delivery */
  async sendToUser(
    userId: number,
    type: string,
    title: string,
    body: string,
    data?: any,
  ) {
    // 1. Save to DB
    const notif = this.notifRepo.create({ userId, type, title, body, data });
    await this.notifRepo.save(notif);

    // 2. Push via Expo (best-effort, no crash on failure)
    try {
      const tokens = await this.tokenRepo.find({ where: { userId } });
      if (tokens.length > 0) {
        await this.sendExpoPush(
          tokens.map((t) => t.token),
          title,
          body,
          data,
        );
      }
    } catch (err) {
      console.warn(`Push failed for user ${userId}:`, (err as Error).message);
    }

    return notif;
  }

  /** Send to multiple users (e.g. all bookmarkers of a cafe) */
  async sendToUsers(
    userIds: number[],
    type: string,
    title: string,
    body: string,
    data?: any,
  ) {
    for (const userId of userIds) {
      await this.sendToUser(userId, type, title, body, data);
    }
  }

  async list(userId: number, page = 1, limit = 30) {
    const [data, total] = await this.notifRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { page, limit, total } };
  }

  async unreadCount(userId: number) {
    return this.notifRepo.count({ where: { userId, isRead: false } });
  }

  async markRead(userId: number, notifId: number) {
    await this.notifRepo.update({ id: notifId, userId }, { isRead: true });
  }

  async markAllRead(userId: number) {
    await this.notifRepo.update({ userId, isRead: false }, { isRead: true });
  }

  async registerToken(userId: number, token: string, platform: string) {
    // Upsert: if token already exists for another user, reassign
    const existing = await this.tokenRepo.findOne({ where: { token } });
    if (existing) {
      existing.userId = userId;
      existing.platform = platform;
      return this.tokenRepo.save(existing);
    }
    return this.tokenRepo.save(this.tokenRepo.create({ userId, token, platform }));
  }

  // ── Expo Push (lightweight, using native fetch — no extra deps) ──

  private async sendExpoPush(tokens: string[], title: string, body: string, data?: any) {
    const messages = tokens.map((token) => ({
      to: token,
      title,
      body,
      data,
      sound: 'default' as const,
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  }
}
