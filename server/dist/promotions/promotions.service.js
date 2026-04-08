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
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const promotion_entity_1 = require("./entities/promotion.entity");
const advertisement_package_entity_1 = require("./entities/advertisement-package.entity");
const promotion_slot_entity_1 = require("./entities/promotion-slot.entity");
const cafe_entity_1 = require("../cafes/entities/cafe.entity");
let PromotionsService = class PromotionsService {
    promotionsRepo;
    packagesRepo;
    slotsRepo;
    cafesRepo;
    constructor(promotionsRepo, packagesRepo, slotsRepo, cafesRepo) {
        this.promotionsRepo = promotionsRepo;
        this.packagesRepo = packagesRepo;
        this.slotsRepo = slotsRepo;
        this.cafesRepo = cafesRepo;
    }
    async getPackages() {
        return this.packagesRepo.find({
            where: { isActive: true },
            order: { displayOrder: 'ASC' },
        });
    }
    async getAvailability(packageId, type) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const pkg = await this.packagesRepo.findOne({ where: { id: packageId } });
        if (!pkg)
            throw new common_1.NotFoundException('Package not found');
        let slot = await this.slotsRepo.findOne({
            where: { packageId, promotionType: type, month: currentMonth },
        });
        if (!slot) {
            slot = this.slotsRepo.create({
                packageId,
                promotionType: type,
                month: currentMonth,
                totalSlots: pkg.monthlySlots,
                usedSlots: 0,
                reservedSlots: 0,
            });
            await this.slotsRepo.save(slot);
        }
        return {
            packageId,
            type,
            month: currentMonth,
            totalSlots: slot.totalSlots,
            usedSlots: slot.usedSlots,
            availableSlots: slot.totalSlots - slot.usedSlots - slot.reservedSlots,
        };
    }
    async createPromotion(userId, dto) {
        const cafe = await this.cafesRepo.findOne({ where: { ownerId: userId } });
        if (!cafe)
            throw new common_1.NotFoundException('Register your cafe first');
        const existing = await this.promotionsRepo.findOne({
            where: {
                cafeId: cafe.id,
                status: 'active',
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('You already have an active promotion. Wait for it to expire or contact support.');
        }
        const pkg = await this.packagesRepo.findOne({ where: { id: dto.packageId } });
        if (!pkg)
            throw new common_1.NotFoundException('Package not found');
        const promotion = this.promotionsRepo.create({
            cafeId: cafe.id,
            packageId: dto.packageId,
            type: dto.type,
            billingCycle: dto.billingCycle || 'monthly',
            status: 'pending_payment',
            contentTitle: dto.contentTitle || null,
            contentDescription: dto.contentDescription || null,
            contentPhotoUrl: dto.contentPhotoUrl || null,
            highlightedFacilities: dto.highlightedFacilities || null,
        });
        return this.promotionsRepo.save(promotion);
    }
    async getMyPromotions(userId) {
        const cafe = await this.cafesRepo.findOne({ where: { ownerId: userId } });
        if (!cafe)
            return [];
        return this.promotionsRepo.find({
            where: { cafeId: cafe.id },
            relations: ['package'],
            order: { createdAt: 'DESC' },
        });
    }
    async getPromotionById(id, userId) {
        const promotion = await this.promotionsRepo.findOne({
            where: { id },
            relations: ['package', 'cafe'],
        });
        if (!promotion)
            throw new common_1.NotFoundException('Promotion not found');
        if (promotion.cafe?.ownerId !== userId) {
            throw new common_1.ForbiddenException('Not your promotion');
        }
        return promotion;
    }
    async updateContent(id, userId, dto) {
        const promotion = await this.getPromotionById(id, userId);
        Object.assign(promotion, dto);
        return this.promotionsRepo.save(promotion);
    }
    async activatePromotion(promotionId) {
        const promotion = await this.promotionsRepo.findOne({
            where: { id: promotionId },
            relations: ['package'],
        });
        if (!promotion)
            throw new common_1.NotFoundException('Promotion not found');
        if (promotion.status !== 'pending_payment' && promotion.status !== 'pending_review') {
            throw new common_1.BadRequestException('Promotion cannot be activated from current status');
        }
        const currentMonth = new Date().toISOString().slice(0, 7);
        let slot = await this.slotsRepo.findOne({
            where: {
                packageId: promotion.packageId,
                promotionType: promotion.type,
                month: currentMonth,
            },
        });
        if (!slot) {
            slot = this.slotsRepo.create({
                packageId: promotion.packageId,
                promotionType: promotion.type,
                month: currentMonth,
                totalSlots: promotion.package?.monthlySlots || 20,
                usedSlots: 0,
                reservedSlots: 0,
            });
            await this.slotsRepo.save(slot);
        }
        if (slot.usedSlots >= slot.totalSlots) {
            throw new common_1.BadRequestException('No available slots for this package/period');
        }
        slot.usedSlots += 1;
        await this.slotsRepo.save(slot);
        const now = new Date();
        const durationDays = promotion.billingCycle === 'annual' ? 365 : 30;
        const expiresAt = new Date(now.getTime() + durationDays * 86400000);
        promotion.status = 'active';
        promotion.startedAt = now;
        promotion.expiresAt = expiresAt;
        await this.promotionsRepo.save(promotion);
        await this.cafesRepo.update(promotion.cafeId, {
            hasActivePromotion: true,
            activePromotionType: promotion.type,
        });
        return promotion;
    }
    async rejectPromotion(promotionId, reason) {
        const promotion = await this.promotionsRepo.findOne({ where: { id: promotionId } });
        if (!promotion)
            throw new common_1.NotFoundException('Promotion not found');
        promotion.status = 'rejected';
        promotion.rejectionReason = reason;
        return this.promotionsRepo.save(promotion);
    }
    async getActivePromotions(type) {
        const qb = this.promotionsRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.cafe', 'cafe')
            .leftJoinAndSelect('p.package', 'pkg')
            .where('p.status = :status', { status: 'active' })
            .andWhere('p.expires_at > NOW()');
        if (type) {
            qb.andWhere('p.type = :type', { type });
        }
        qb.orderBy('pkg.display_order', 'DESC')
            .addOrderBy('p.started_at', 'ASC');
        return qb.getMany();
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(promotion_entity_1.Promotion)),
    __param(1, (0, typeorm_1.InjectRepository)(advertisement_package_entity_1.AdvertisementPackage)),
    __param(2, (0, typeorm_1.InjectRepository)(promotion_slot_entity_1.PromotionSlot)),
    __param(3, (0, typeorm_1.InjectRepository)(cafe_entity_1.Cafe)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PromotionsService);
//# sourceMappingURL=promotions.service.js.map