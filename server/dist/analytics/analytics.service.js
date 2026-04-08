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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cafe_analytics_entity_1 = require("./entities/cafe-analytics.entity");
let AnalyticsService = class AnalyticsService {
    analyticsRepo;
    dataSource;
    constructor(analyticsRepo, dataSource) {
        this.analyticsRepo = analyticsRepo;
        this.dataSource = dataSource;
    }
    async trackEvent(cafeId, eventType, promotionId) {
        const event = this.analyticsRepo.create({
            cafeId,
            eventType,
            promotionId: promotionId || null,
        });
        await this.analyticsRepo.save(event);
        return { tracked: true };
    }
    async getSummary(cafeId, days = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const results = await this.dataSource.query(`SELECT
        DATE(created_at) AS date,
        event_type AS eventType,
        COUNT(*) AS count
       FROM cafe_analytics
       WHERE cafe_id = ? AND created_at >= ?
       GROUP BY DATE(created_at), event_type
       ORDER BY date ASC`, [cafeId, since]);
        return results.map((r) => ({
            date: r.date,
            eventType: r.eventType,
            count: Number(r.count),
        }));
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cafe_analytics_entity_1.CafeAnalytics)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map