"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const push_token_entity_1 = require("./entities/push-token.entity");
let NotificationsService = class NotificationsService {
    notifRepo;
    tokenRepo;
    constructor(notifRepo, tokenRepo) {
        this.notifRepo = notifRepo;
        this.tokenRepo = tokenRepo;
    }
    async sendToUser(userId, type, title, body, data) {
        const notif = this.notifRepo.create({ userId, type, title, body, data });
        await this.notifRepo.save(notif);
        try {
            const tokens = await this.tokenRepo.find({ where: { userId } });
            if (tokens.length > 0) {
                await this.sendExpoPush(tokens.map((t) => t.token), title, body, data);
            }
        }
        catch (err) {
            console.warn(`Push failed for user ${userId}:`, err.message);
        }
        return notif;
    }
    async sendToUsers(userIds, type, title, body, data) {
        for (const userId of userIds) {
            await this.sendToUser(userId, type, title, body, data);
        }
    }
    async list(userId, page = 1, limit = 30) {
        const [data, total] = await this.notifRepo.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { page, limit, total } };
    }
    async unreadCount(userId) {
        return this.notifRepo.count({ where: { userId, isRead: false } });
    }
    async markRead(userId, notifId) {
        await this.notifRepo.update({ id: notifId, userId }, { isRead: true });
    }
    async markAllRead(userId) {
        await this.notifRepo.update({ userId, isRead: false }, { isRead: true });
    }
    async registerToken(userId, token, platform) {
        const existing = await this.tokenRepo.findOne({ where: { token } });
        if (existing) {
            existing.userId = userId;
            existing.platform = platform;
            return this.tokenRepo.save(existing);
        }
        return this.tokenRepo.save(this.tokenRepo.create({ userId, token, platform }));
    }
    async sendExpoPush(tokens, title, body, data) {
        const messages = tokens.map((token) => ({
            to: token,
            title,
            body,
            data,
            sound: 'default',
        }));
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(1, (0, typeorm_1.InjectRepository)(push_token_entity_1.PushToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map