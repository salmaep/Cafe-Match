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
exports.FriendsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const friend_request_entity_1 = require("./entities/friend-request.entity");
const friendship_entity_1 = require("./entities/friendship.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const achievements_service_1 = require("../achievements/achievements.service");
let FriendsService = class FriendsService {
    requestRepo;
    friendshipRepo;
    userRepo;
    dataSource;
    notificationsService;
    achievementsService;
    constructor(requestRepo, friendshipRepo, userRepo, dataSource, notificationsService, achievementsService) {
        this.requestRepo = requestRepo;
        this.friendshipRepo = friendshipRepo;
        this.userRepo = userRepo;
        this.dataSource = dataSource;
        this.notificationsService = notificationsService;
        this.achievementsService = achievementsService;
    }
    async sendRequest(senderId, friendCode) {
        const receiver = await this.userRepo.findOne({ where: { friendCode } });
        if (!receiver)
            throw new common_1.NotFoundException('Kode teman tidak ditemukan');
        if (receiver.id === senderId)
            throw new common_1.BadRequestException('Gak bisa add diri sendiri dong');
        const [a, b] = senderId < receiver.id ? [senderId, receiver.id] : [receiver.id, senderId];
        const existing = await this.friendshipRepo.findOne({ where: { userAId: a, userBId: b } });
        if (existing)
            throw new common_1.ConflictException('Kalian sudah berteman');
        const existingReq = await this.requestRepo.findOne({
            where: [
                { senderId, receiverId: receiver.id },
                { senderId: receiver.id, receiverId: senderId },
            ],
        });
        if (existingReq) {
            if (existingReq.status === 'pending')
                throw new common_1.ConflictException('Request sudah dikirim');
            if (existingReq.status === 'accepted')
                throw new common_1.ConflictException('Kalian sudah berteman');
        }
        const request = this.requestRepo.create({ senderId, receiverId: receiver.id });
        const saved = await this.requestRepo.save(request);
        const sender = await this.userRepo.findOne({ where: { id: senderId } });
        await this.notificationsService.sendToUser(receiver.id, 'friend_request', 'Permintaan Pertemanan', `${sender?.name || 'Seseorang'} mau jadi temen kamu di CafeMatch!`, { requestId: saved.id, senderId });
        return saved;
    }
    async acceptRequest(userId, requestId) {
        const request = await this.requestRepo.findOne({ where: { id: requestId, receiverId: userId, status: 'pending' } });
        if (!request)
            throw new common_1.NotFoundException('Request tidak ditemukan');
        request.status = 'accepted';
        await this.requestRepo.save(request);
        const [a, b] = request.senderId < request.receiverId
            ? [request.senderId, request.receiverId]
            : [request.receiverId, request.senderId];
        await this.friendshipRepo.save(this.friendshipRepo.create({ userAId: a, userBId: b }));
        const accepter = await this.userRepo.findOne({ where: { id: userId } });
        await this.notificationsService.sendToUser(request.senderId, 'friend_request', 'Permintaan Diterima!', `${accepter?.name || 'Seseorang'} menerima permintaan pertemanan kamu!`, { friendId: userId });
        try {
            const [senderCount, receiverCount] = await Promise.all([
                this.friendCount(request.senderId),
                this.friendCount(request.receiverId),
            ]);
            await this.achievementsService.checkSocialAchievements(request.senderId, 'friends', senderCount);
            await this.achievementsService.checkSocialAchievements(request.receiverId, 'friends', receiverCount);
        }
        catch (err) {
            console.warn('[friends] achievement check failed:', err?.message);
        }
        return { message: 'Berhasil berteman!' };
    }
    async rejectRequest(userId, requestId) {
        const request = await this.requestRepo.findOne({ where: { id: requestId, receiverId: userId, status: 'pending' } });
        if (!request)
            throw new common_1.NotFoundException('Request tidak ditemukan');
        request.status = 'rejected';
        await this.requestRepo.save(request);
        return { message: 'Request ditolak' };
    }
    async pendingRequests(userId) {
        return this.requestRepo.find({
            where: { receiverId: userId, status: 'pending' },
            relations: ['sender'],
            order: { createdAt: 'DESC' },
        });
    }
    async friendList(userId) {
        const rows = await this.dataSource.query(`SELECT u.id, u.name, u.email, u.friend_code AS friendCode, u.avatar_url AS avatarUrl
       FROM friendships f
       JOIN users u ON (u.id = f.user_a_id OR u.id = f.user_b_id) AND u.id != ?
       WHERE f.user_a_id = ? OR f.user_b_id = ?`, [userId, userId, userId]);
        return rows;
    }
    async friendsOnMap(userId) {
        const rows = await this.dataSource.query(`SELECT u.id, u.name, u.avatar_url AS avatarUrl,
              c.id AS cafeId, c.name AS cafeName, c.latitude, c.longitude,
              ck.check_in_at AS checkInAt
       FROM friendships f
       JOIN users u ON (u.id = f.user_a_id OR u.id = f.user_b_id) AND u.id != ?
       JOIN checkins ck ON ck.user_id = u.id AND ck.check_out_at IS NULL
       JOIN cafes c ON c.id = ck.cafe_id
       WHERE f.user_a_id = ? OR f.user_b_id = ?`, [userId, userId, userId]);
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
    async friendsAtCafe(userId, cafeId) {
        const rows = await this.dataSource.query(`SELECT ck.user_id AS friendId
       FROM friendships f
       JOIN users u ON (u.id = f.user_a_id OR u.id = f.user_b_id) AND u.id != ?
       JOIN checkins ck ON ck.user_id = u.id AND ck.check_out_at IS NULL AND ck.cafe_id = ?
       WHERE f.user_a_id = ? OR f.user_b_id = ?`, [userId, cafeId, userId, userId]);
        return rows.map((r) => r.friendId);
    }
    async friendCount(userId) {
        const [{ cnt }] = await this.dataSource.query(`SELECT COUNT(*) AS cnt FROM friendships WHERE user_a_id = ? OR user_b_id = ?`, [userId, userId]);
        return parseInt(cnt, 10);
    }
    async throwEmoji(senderId, targetFriendId, emoji) {
        const [a, b] = senderId < targetFriendId
            ? [senderId, targetFriendId]
            : [targetFriendId, senderId];
        const friendship = await this.friendshipRepo.findOne({
            where: { userAId: a, userBId: b },
        });
        if (!friendship)
            throw new common_1.BadRequestException('Kalian belum berteman');
        const sender = await this.userRepo.findOne({ where: { id: senderId } });
        await this.notificationsService.sendToUser(targetFriendId, 'emoji_spam', `${sender?.name || 'Seorang teman'} kirim ${emoji}!`, `Kamu dapet emoji ${emoji} dari ${sender?.name || 'temanmu'}`, {
            senderId,
            senderName: sender?.name || 'Unknown',
            emoji,
            timestamp: Date.now(),
        });
        return { message: 'Emoji sent!', emoji };
    }
};
exports.FriendsService = FriendsService;
exports.FriendsService = FriendsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(friend_request_entity_1.FriendRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(friendship_entity_1.Friendship)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        notifications_service_1.NotificationsService,
        achievements_service_1.AchievementsService])
], FriendsService);
//# sourceMappingURL=friends.service.js.map