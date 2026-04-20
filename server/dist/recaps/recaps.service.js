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
exports.RecapsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_recap_entity_1 = require("./entities/user-recap.entity");
let RecapsService = class RecapsService {
    recapRepo;
    dataSource;
    constructor(recapRepo, dataSource) {
        this.recapRepo = recapRepo;
        this.dataSource = dataSource;
    }
    async getRecap(userId, year) {
        return this.recapRepo.findOne({ where: { userId, year } });
    }
    async generateRecap(userId, year) {
        const start = `${year}-01-01`;
        const end = `${year}-12-31 23:59:59`;
        const [{ totalCheckins }] = await this.dataSource.query(`SELECT COUNT(*) AS totalCheckins FROM checkins WHERE user_id = ? AND check_in_at BETWEEN ? AND ?`, [userId, start, end]);
        const [{ totalCafes }] = await this.dataSource.query(`SELECT COUNT(DISTINCT cafe_id) AS totalCafes FROM checkins WHERE user_id = ? AND check_in_at BETWEEN ? AND ?`, [userId, start, end]);
        const [{ totalMinutes }] = await this.dataSource.query(`SELECT COALESCE(SUM(duration_minutes), 0) AS totalMinutes FROM checkins WHERE user_id = ? AND check_in_at BETWEEN ? AND ?`, [userId, start, end]);
        const topCafes = await this.dataSource.query(`SELECT c.id AS cafeId, c.name, COUNT(ck.id) AS visits,
              (SELECT ph.url FROM cafe_photos ph WHERE ph.cafe_id = c.id AND ph.is_primary = TRUE LIMIT 1) AS photo
       FROM checkins ck JOIN cafes c ON c.id = ck.cafe_id
       WHERE ck.user_id = ? AND ck.check_in_at BETWEEN ? AND ?
       GROUP BY c.id, c.name ORDER BY visits DESC LIMIT 5`, [userId, start, end]);
        const purposeRows = await this.dataSource.query(`SELECT p.name, COUNT(DISTINCT ck.cafe_id) AS cnt
       FROM checkins ck
       JOIN cafe_facilities cf ON cf.cafe_id = ck.cafe_id
       JOIN purpose_requirements pr ON pr.facility_key = cf.facility_key AND pr.is_mandatory = TRUE
       JOIN purposes p ON p.id = pr.purpose_id
       WHERE ck.user_id = ? AND ck.check_in_at BETWEEN ? AND ?
       GROUP BY p.name ORDER BY cnt DESC LIMIT 1`, [userId, start, end]);
        const topPurpose = purposeRows[0]?.name || 'Cafe Explorer';
        const [{ totalReviews }] = await this.dataSource.query(`SELECT COUNT(*) AS totalReviews FROM reviews WHERE user_id = ? AND created_at BETWEEN ? AND ?`, [userId, start, end]);
        const [{ achievementsUnlocked }] = await this.dataSource.query(`SELECT COUNT(*) AS achievementsUnlocked FROM user_achievements WHERE user_id = ? AND unlocked_at BETWEEN ? AND ?`, [userId, start, end]);
        const [{ friendsMade }] = await this.dataSource.query(`SELECT COUNT(*) AS friendsMade FROM friendships WHERE (user_a_id = ? OR user_b_id = ?) AND created_at BETWEEN ? AND ?`, [userId, userId, start, end]);
        const [streakRow] = await this.dataSource.query(`SELECT COALESCE(MAX(longest_streak), 0) AS longestStreak FROM user_streaks WHERE user_id = ? AND streak_type = 'global'`, [userId]);
        const dayRows = await this.dataSource.query(`SELECT DAYNAME(check_in_at) AS dayName, COUNT(*) AS cnt
       FROM checkins WHERE user_id = ? AND check_in_at BETWEEN ? AND ?
       GROUP BY dayName ORDER BY cnt DESC LIMIT 1`, [userId, start, end]);
        const [{ avgSession }] = await this.dataSource.query(`SELECT COALESCE(AVG(duration_minutes), 0) AS avgSession FROM checkins WHERE user_id = ? AND duration_minutes IS NOT NULL AND check_in_at BETWEEN ? AND ?`, [userId, start, end]);
        const yearTitle = this.computeYearTitle(topPurpose, parseInt(totalCheckins, 10), dayRows[0]?.dayName);
        const recapData = {
            yearTitle,
            totalCheckins: parseInt(totalCheckins, 10),
            totalCafesVisited: parseInt(totalCafes, 10),
            totalDurationHours: Math.round(parseInt(totalMinutes, 10) / 60),
            topCafes: topCafes.map((c) => ({
                cafeId: c.cafeId,
                name: c.name,
                visits: parseInt(c.visits, 10),
                photo: c.photo || null,
            })),
            topPurpose,
            totalReviews: parseInt(totalReviews, 10),
            achievementsUnlocked: parseInt(achievementsUnlocked, 10),
            friendsMade: parseInt(friendsMade, 10),
            longestStreak: streakRow?.longestStreak || 0,
            favoriteDay: dayRows[0]?.dayName || 'N/A',
            averageSessionMinutes: Math.round(parseFloat(avgSession)),
        };
        let recap = await this.recapRepo.findOne({ where: { userId, year } });
        if (recap) {
            recap.recapData = recapData;
            recap.generatedAt = new Date();
        }
        else {
            recap = this.recapRepo.create({ userId, year, recapData });
        }
        await this.recapRepo.save(recap);
        return recapData;
    }
    computeYearTitle(topPurpose, totalCheckins, favDay) {
        const purposeMap = {
            'Work from Cafe': 'Si Pekerja Kafe',
            'Me Time': 'Petualang Me Time',
            'Date': 'Si Romantis Kafe',
            'Family Time': 'Family Cafe Explorer',
            'Group Work / Study': 'Si Rajin Belajar',
        };
        if (totalCheckins >= 200)
            return 'Kafe Addict Sejati';
        if (totalCheckins >= 100)
            return 'Legenda Nongkrong';
        if (purposeMap[topPurpose])
            return purposeMap[topPurpose];
        if (favDay === 'Saturday' || favDay === 'Sunday')
            return 'Weekend Cafe Hunter';
        return `Pecinta Kafe ${new Date().getFullYear()}`;
    }
};
exports.RecapsService = RecapsService;
exports.RecapsService = RecapsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_recap_entity_1.UserRecap)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], RecapsService);
//# sourceMappingURL=recaps.service.js.map