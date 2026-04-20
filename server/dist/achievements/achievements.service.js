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
exports.AchievementsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const achievement_entity_1 = require("./entities/achievement.entity");
const user_achievement_entity_1 = require("./entities/user-achievement.entity");
const notifications_service_1 = require("../notifications/notifications.service");
let AchievementsService = class AchievementsService {
    achievementRepo;
    userAchievementRepo;
    dataSource;
    notificationsService;
    constructor(achievementRepo, userAchievementRepo, dataSource, notificationsService) {
        this.achievementRepo = achievementRepo;
        this.userAchievementRepo = userAchievementRepo;
        this.dataSource = dataSource;
        this.notificationsService = notificationsService;
    }
    async findAll() {
        return this.achievementRepo.find({ order: { category: 'ASC', threshold: 'ASC' } });
    }
    async findByUser(userId) {
        const achievements = await this.achievementRepo.find();
        const userAchievements = await this.userAchievementRepo.find({ where: { userId } });
        const uaMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]));
        return achievements.map((a) => {
            const ua = uaMap.get(a.id);
            return {
                ...a,
                progress: ua?.progress || 0,
                unlocked: !!ua?.unlockedAt,
                unlockedAt: ua?.unlockedAt || null,
            };
        });
    }
    async findPublicByUser(userId) {
        return this.userAchievementRepo.find({
            where: { userId },
            relations: ['achievement'],
            order: { unlockedAt: 'DESC' },
        });
    }
    async checkCheckinAchievements(userId) {
        const newlyUnlocked = [];
        const [{ total }] = await this.dataSource.query(`SELECT COUNT(*) AS total FROM checkins WHERE user_id = ?`, [userId]);
        const totalCount = parseInt(total, 10);
        await this.checkAndAward(userId, 'visit_general', null, totalCount, newlyUnlocked);
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const purposeCounts = await this.dataSource.query(`SELECT pr.purpose_slug, COUNT(DISTINCT ck.cafe_id) AS cnt
       FROM checkins ck
       JOIN cafe_facilities cf ON cf.cafe_id = ck.cafe_id
       JOIN purpose_requirements pr2 ON pr2.facility_key = cf.facility_key AND pr2.is_mandatory = TRUE
       JOIN purposes p ON p.id = pr2.purpose_id
       JOIN (SELECT DISTINCT slug AS purpose_slug FROM purposes) pr ON pr.purpose_slug = p.slug
       WHERE ck.user_id = ? AND ck.check_in_at >= ?
       GROUP BY pr.purpose_slug`, [userId, monthStart.toISOString().split('T')[0]]);
        for (const pc of purposeCounts) {
            await this.checkAndAward(userId, 'visit_purpose', pc.purpose_slug, parseInt(pc.cnt, 10), newlyUnlocked);
        }
        const [streakRow] = await this.dataSource.query(`SELECT longest_streak FROM user_streaks WHERE user_id = ? AND streak_type = 'global'`, [userId]);
        if (streakRow) {
            await this.checkAndAward(userId, 'streak', null, streakRow.longest_streak, newlyUnlocked);
        }
        return newlyUnlocked;
    }
    async checkSocialAchievements(userId, metric, count) {
        const newlyUnlocked = [];
        const achievements = await this.achievementRepo.find({ where: { category: 'social' } });
        for (const a of achievements) {
            const matches = (metric === 'friends' && a.slug.includes('friend')) ||
                (metric === 'reviews' && a.slug.includes('review'));
            if (!matches)
                continue;
            if (count >= a.threshold) {
                await this.awardIfNew(userId, a.id, count, newlyUnlocked, a.name);
            }
        }
        return newlyUnlocked;
    }
    async checkAndAward(userId, category, purposeSlug, currentCount, newlyUnlocked) {
        const where = { category };
        if (purposeSlug)
            where.purposeSlug = purposeSlug;
        const achievements = await this.achievementRepo.find({ where });
        for (const a of achievements) {
            await this.awardIfNew(userId, a.id, currentCount, newlyUnlocked, a.name);
        }
    }
    async awardIfNew(userId, achievementId, progress, newlyUnlocked, achievementName) {
        let ua = await this.userAchievementRepo.findOne({
            where: { userId, achievementId },
        });
        const achievement = await this.achievementRepo.findOne({ where: { id: achievementId } });
        if (!achievement)
            return;
        if (!ua) {
            ua = this.userAchievementRepo.create({ userId, achievementId, progress: 0 });
        }
        ua.progress = progress;
        if (!ua.unlockedAt && progress >= achievement.threshold) {
            ua.unlockedAt = new Date();
            newlyUnlocked.push(achievementName);
            await this.notificationsService.sendToUser(userId, 'achievement_unlocked', 'Achievement Unlocked! 🏆', `Selamat! Kamu dapat "${achievementName}"`, { achievementId });
        }
        await this.userAchievementRepo.save(ua);
    }
};
exports.AchievementsService = AchievementsService;
exports.AchievementsService = AchievementsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(achievement_entity_1.Achievement)),
    __param(1, (0, typeorm_1.InjectRepository)(user_achievement_entity_1.UserAchievement)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        notifications_service_1.NotificationsService])
], AchievementsService);
//# sourceMappingURL=achievements.service.js.map