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
exports.OwnerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cafe_entity_1 = require("../cafes/entities/cafe.entity");
const cafe_menu_entity_1 = require("../menus/entities/cafe-menu.entity");
const cafe_photo_entity_1 = require("../photos/entities/cafe-photo.entity");
const cafe_facility_entity_1 = require("../cafes/entities/cafe-facility.entity");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
const cafe_analytics_entity_1 = require("../analytics/entities/cafe-analytics.entity");
let OwnerService = class OwnerService {
    cafesRepo;
    menusRepo;
    photosRepo;
    facilitiesRepo;
    promotionsRepo;
    analyticsRepo;
    dataSource;
    constructor(cafesRepo, menusRepo, photosRepo, facilitiesRepo, promotionsRepo, analyticsRepo, dataSource) {
        this.cafesRepo = cafesRepo;
        this.menusRepo = menusRepo;
        this.photosRepo = photosRepo;
        this.facilitiesRepo = facilitiesRepo;
        this.promotionsRepo = promotionsRepo;
        this.analyticsRepo = analyticsRepo;
        this.dataSource = dataSource;
    }
    async getOwnerCafe(userId) {
        return this.cafesRepo.findOne({
            where: { ownerId: userId },
            relations: ['facilities', 'menus', 'photos'],
        });
    }
    async createCafe(userId, dto) {
        const existing = await this.cafesRepo.findOne({ where: { ownerId: userId } });
        if (existing) {
            throw new common_1.ConflictException('You already have a cafe registered');
        }
        const slug = dto.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim() + '-' + Date.now().toString(36);
        const cafe = this.cafesRepo.create({
            name: dto.name,
            slug,
            address: dto.address,
            phone: dto.phone || null,
            description: dto.description || null,
            latitude: dto.latitude || -6.8965,
            longitude: dto.longitude || 107.591,
            ownerId: userId,
            googleMapsUrl: `https://www.google.com/maps?q=${dto.latitude || -6.8965},${dto.longitude || 107.591}`,
        });
        return this.cafesRepo.save(cafe);
    }
    async updateCafe(userId, dto) {
        const cafe = await this.requireOwnerCafe(userId);
        Object.assign(cafe, dto);
        if (dto.latitude || dto.longitude) {
            cafe.googleMapsUrl = `https://www.google.com/maps?q=${cafe.latitude},${cafe.longitude}`;
        }
        return this.cafesRepo.save(cafe);
    }
    async updateMenus(userId, items) {
        const cafe = await this.requireOwnerCafe(userId);
        await this.menusRepo.delete({ cafeId: cafe.id });
        const newMenus = items.map((item) => this.menusRepo.create({
            cafeId: cafe.id,
            category: item.category,
            itemName: item.itemName,
            price: item.price,
            description: item.description || null,
            isAvailable: item.isAvailable ?? true,
        }));
        return this.menusRepo.save(newMenus);
    }
    async getDashboard(userId) {
        const cafe = await this.getOwnerCafe(userId);
        if (!cafe) {
            return { hasCafe: false };
        }
        const activePromotion = await this.promotionsRepo.findOne({
            where: { cafeId: cafe.id, status: 'active' },
            relations: ['package'],
        });
        const pendingPromotions = await this.promotionsRepo.find({
            where: { cafeId: cafe.id, status: 'pending_review' },
        });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [analyticsRaw] = await this.dataSource.query(`SELECT
        COALESCE(SUM(event_type = 'view'), 0) AS totalViews,
        COALESCE(SUM(event_type = 'click'), 0) AS totalClicks
       FROM cafe_analytics
       WHERE cafe_id = ? AND created_at >= ?`, [cafe.id, thirtyDaysAgo]);
        return {
            hasCafe: true,
            cafe: {
                id: cafe.id,
                name: cafe.name,
                bookmarksCount: cafe.bookmarksCount,
                favoritesCount: cafe.favoritesCount,
            },
            analytics: {
                totalViews: Number(analyticsRaw?.totalViews || 0),
                totalClicks: Number(analyticsRaw?.totalClicks || 0),
            },
            activePromotion: activePromotion
                ? {
                    id: activePromotion.id,
                    type: activePromotion.type,
                    packageName: activePromotion.package?.name,
                    expiresAt: activePromotion.expiresAt,
                    daysRemaining: activePromotion.expiresAt
                        ? Math.max(0, Math.ceil((new Date(activePromotion.expiresAt).getTime() - Date.now()) / 86400000))
                        : null,
                    status: activePromotion.status,
                }
                : null,
            pendingCount: pendingPromotions.length,
        };
    }
    async requireOwnerCafe(userId) {
        const cafe = await this.cafesRepo.findOne({ where: { ownerId: userId } });
        if (!cafe) {
            throw new common_1.NotFoundException('No cafe found. Please register your cafe first.');
        }
        return cafe;
    }
};
exports.OwnerService = OwnerService;
exports.OwnerService = OwnerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cafe_entity_1.Cafe)),
    __param(1, (0, typeorm_1.InjectRepository)(cafe_menu_entity_1.CafeMenu)),
    __param(2, (0, typeorm_1.InjectRepository)(cafe_photo_entity_1.CafePhoto)),
    __param(3, (0, typeorm_1.InjectRepository)(cafe_facility_entity_1.CafeFacility)),
    __param(4, (0, typeorm_1.InjectRepository)(promotion_entity_1.Promotion)),
    __param(5, (0, typeorm_1.InjectRepository)(cafe_analytics_entity_1.CafeAnalytics)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], OwnerService);
//# sourceMappingURL=owner.service.js.map