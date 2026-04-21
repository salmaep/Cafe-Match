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
exports.CheckinsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const checkin_entity_1 = require("./entities/checkin.entity");
const user_streak_entity_1 = require("./entities/user-streak.entity");
const cafe_entity_1 = require("../cafes/entities/cafe.entity");
const achievements_service_1 = require("../achievements/achievements.service");
const notifications_service_1 = require("../notifications/notifications.service");
const RANK_BADGES = {
    1: 'Kuncen',
    2: 'Langganan Setia',
    3: 'Reguler Sejati',
};
let CheckinsService = class CheckinsService {
    checkinRepo;
    streakRepo;
    cafeRepo;
    dataSource;
    achievementsService;
    notificationsService;
    constructor(checkinRepo, streakRepo, cafeRepo, dataSource, achievementsService, notificationsService) {
        this.checkinRepo = checkinRepo;
        this.streakRepo = streakRepo;
        this.cafeRepo = cafeRepo;
        this.dataSource = dataSource;
        this.achievementsService = achievementsService;
        this.notificationsService = notificationsService;
    }
    async checkIn(userId, dto) {
        const cafe = await this.cafeRepo.findOne({ where: { id: dto.cafeId, isActive: true } });
        if (!cafe)
            throw new common_1.NotFoundException('Cafe tidak ditemukan');
        const distance = this.haversineMeters(dto.latitude, dto.longitude, Number(cafe.latitude), Number(cafe.longitude));
        const skipGps = process.env.CHECKIN_SKIP_GPS === 'true';
        if (!skipGps && distance > 300) {
            throw new common_1.BadRequestException(`Kamu terlalu jauh dari cafe ini (${Math.round(distance)}m). Maksimal 300m untuk check-in.`);
        }
        const active = await this.checkinRepo.findOne({
            where: { userId, checkOutAt: (0, typeorm_2.IsNull)() },
        });
        if (active) {
            await this.performCheckout(active);
        }
        const checkin = this.checkinRepo.create({
            userId,
            cafeId: dto.cafeId,
            verified: true,
        });
        const saved = await this.checkinRepo.save(checkin);
        await this.updateStreak(userId, dto.cafeId);
        try {
            await this.achievementsService.checkCheckinAchievements(userId);
        }
        catch (err) {
            console.warn('[checkin] achievement check failed:', err?.message);
        }
        let togetherWith = [];
        try {
            togetherWith = await this.detectFriendsAtSameCafe(userId, dto.cafeId);
            if (togetherWith.length > 0) {
                for (const friend of togetherWith) {
                    const [a, b] = userId < friend.id ? [userId, friend.id] : [friend.id, userId];
                    await this.dataSource.query(`INSERT INTO together_counts (user_a_id, user_b_id, cafe_id, count)
             VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE count = count + 1`, [a, b, dto.cafeId]);
                    await this.notificationsService.sendToUser(userId, 'together_bomb', 'Barengan! 💥', `Kamu lagi di ${cafe.name} bareng ${friend.name}!`, { friendId: friend.id, cafeId: dto.cafeId, cafeName: cafe.name });
                    await this.notificationsService.sendToUser(friend.id, 'together_bomb', 'Barengan! 💥', `${friend.selfName || 'Temanmu'} baru aja check-in di ${cafe.name} — kalian lagi bareng!`, { friendId: userId, cafeId: dto.cafeId, cafeName: cafe.name });
                }
            }
        }
        catch (err) {
            console.warn('[checkin] together-bomb check failed:', err?.message);
        }
        return {
            ...saved,
            cafeName: cafe.name,
            distance: Math.round(distance),
            togetherWith: togetherWith.map((f) => ({ id: f.id, name: f.name })),
        };
    }
    async detectFriendsAtSameCafe(userId, cafeId) {
        const [selfRow] = await this.dataSource.query(`SELECT name FROM users WHERE id = ?`, [userId]);
        const selfName = selfRow?.name || 'Temanmu';
        const rows = await this.dataSource.query(`SELECT u.id, u.name
       FROM checkins ck
       JOIN users u ON u.id = ck.user_id
       WHERE ck.cafe_id = ?
         AND ck.check_out_at IS NULL
         AND ck.user_id != ?
         AND EXISTS (
           SELECT 1 FROM friendships f
           WHERE (f.user_a_id = ? AND f.user_b_id = ck.user_id)
              OR (f.user_b_id = ? AND f.user_a_id = ck.user_id)
         )`, [cafeId, userId, userId, userId]);
        return rows.map((r) => ({ ...r, selfName }));
    }
    async checkOut(userId, dto) {
        let checkin = null;
        if (dto.checkinId) {
            checkin = await this.checkinRepo.findOne({ where: { id: dto.checkinId, userId } });
        }
        else if (dto.cafeId) {
            checkin = await this.checkinRepo.findOne({
                where: { userId, cafeId: dto.cafeId, checkOutAt: (0, typeorm_2.IsNull)() },
            });
        }
        else {
            checkin = await this.checkinRepo.findOne({
                where: { userId, checkOutAt: (0, typeorm_2.IsNull)() },
            });
        }
        if (!checkin)
            throw new common_1.NotFoundException('Tidak ada check-in aktif');
        return this.performCheckout(checkin);
    }
    async performCheckout(checkin) {
        checkin.checkOutAt = new Date();
        const diff = checkin.checkOutAt.getTime() - new Date(checkin.checkInAt).getTime();
        checkin.durationMinutes = Math.round(diff / 60000);
        return this.checkinRepo.save(checkin);
    }
    async getActive(userId) {
        const checkin = await this.checkinRepo.findOne({
            where: { userId, checkOutAt: (0, typeorm_2.IsNull)() },
            relations: ['cafe'],
        });
        return checkin || null;
    }
    async history(userId, page = 1, limit = 20) {
        const [data, total] = await this.checkinRepo.findAndCount({
            where: { userId },
            relations: ['cafe'],
            order: { checkInAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { page, limit, total } };
    }
    async leaderboard(cafeId) {
        const rows = await this.dataSource.query(`SELECT u.id AS userId, u.name, u.avatar_url AS avatarUrl,
              COUNT(c.id) AS checkinCount,
              COALESCE(SUM(c.duration_minutes), 0) AS totalMinutes,
              (COUNT(c.id) * 2 + COALESCE(SUM(c.duration_minutes), 0) / 60) AS score
       FROM checkins c
       JOIN users u ON u.id = c.user_id
       WHERE c.cafe_id = ?
       GROUP BY u.id, u.name, u.avatar_url
       ORDER BY score DESC
       LIMIT 10`, [cafeId]);
        return rows.map((r, i) => {
            const rank = i + 1;
            const totalMinutes = parseInt(r.totalMinutes, 10);
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            return {
                rank,
                userId: r.userId,
                name: r.name,
                avatarUrl: r.avatarUrl,
                checkinCount: parseInt(r.checkinCount, 10),
                totalDuration: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
                totalMinutes,
                score: Math.round(parseFloat(r.score) * 10) / 10,
                badge: RANK_BADGES[rank] || (rank <= 10 ? 'Pengunjung Tetap' : null),
            };
        });
    }
    async globalLeaderboard() {
        const rows = await this.dataSource.query(`SELECT u.id AS userId, u.name, u.avatar_url AS avatarUrl,
              COUNT(c.id) AS totalCheckins,
              COUNT(DISTINCT c.cafe_id) AS uniqueCafes,
              COALESCE(SUM(c.duration_minutes), 0) AS totalMinutes,
              (COUNT(c.id) * 2 + COUNT(DISTINCT c.cafe_id) * 5 + COALESCE(SUM(c.duration_minutes), 0) / 60) AS score
       FROM checkins c
       JOIN users u ON u.id = c.user_id
       GROUP BY u.id, u.name, u.avatar_url
       ORDER BY score DESC
       LIMIT 20`);
        return rows.map((r, i) => ({
            rank: i + 1,
            userId: r.userId,
            name: r.name,
            avatarUrl: r.avatarUrl,
            totalCheckins: parseInt(r.totalCheckins, 10),
            uniqueCafes: parseInt(r.uniqueCafes, 10),
            totalMinutes: parseInt(r.totalMinutes, 10),
            totalDuration: Math.floor(parseInt(r.totalMinutes, 10) / 60) > 0
                ? `${Math.floor(parseInt(r.totalMinutes, 10) / 60)}h ${parseInt(r.totalMinutes, 10) % 60}m`
                : `${parseInt(r.totalMinutes, 10)}m`,
            score: Math.round(parseFloat(r.score) * 10) / 10,
        }));
    }
    async getStreak(userId) {
        const global = await this.streakRepo.findOne({
            where: { userId, streakType: 'global' },
        });
        const now = new Date();
        const isActive = global
            ? this.daysBetween(new Date(global.lastCheckinDate), now) <= 7
            : false;
        return {
            current: global?.currentStreak || 0,
            longest: global?.longestStreak || 0,
            active: isActive,
            lastCheckinDate: global?.lastCheckinDate || null,
        };
    }
    async autoCheckoutStale() {
        const result = await this.dataSource.query(`UPDATE checkins
       SET check_out_at = NOW(),
           duration_minutes = TIMESTAMPDIFF(MINUTE, check_in_at, NOW())
       WHERE check_out_at IS NULL
         AND check_in_at < DATE_SUB(NOW(), INTERVAL 4 HOUR)`);
        return result.affectedRows || 0;
    }
    async updateStreak(userId, cafeId) {
        const today = new Date().toISOString().split('T')[0];
        await this.upsertStreak(userId, null, 'global', today);
        await this.upsertStreak(userId, cafeId, 'cafe', today);
    }
    async upsertStreak(userId, cafeId, streakType, today) {
        let streak = await this.streakRepo.findOne({
            where: { userId, cafeId: cafeId, streakType },
        });
        if (!streak) {
            streak = this.streakRepo.create({
                userId,
                cafeId: cafeId,
                streakType,
                currentStreak: 1,
                longestStreak: 1,
                lastCheckinDate: today,
            });
        }
        else {
            const days = this.daysBetween(new Date(streak.lastCheckinDate), new Date(today));
            if (days === 0) {
                return this.streakRepo.save(streak);
            }
            else if (days <= 7) {
                streak.currentStreak += 1;
                streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
            }
            else if (days > 14) {
                streak.currentStreak = 1;
            }
            streak.lastCheckinDate = today;
        }
        return this.streakRepo.save(streak);
    }
    daysBetween(a, b) {
        const msPerDay = 86400000;
        return Math.floor(Math.abs(b.getTime() - a.getTime()) / msPerDay);
    }
    haversineMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
};
exports.CheckinsService = CheckinsService;
exports.CheckinsService = CheckinsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(checkin_entity_1.Checkin)),
    __param(1, (0, typeorm_1.InjectRepository)(user_streak_entity_1.UserStreak)),
    __param(2, (0, typeorm_1.InjectRepository)(cafe_entity_1.Cafe)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        achievements_service_1.AchievementsService,
        notifications_service_1.NotificationsService])
], CheckinsService);
//# sourceMappingURL=checkins.service.js.map