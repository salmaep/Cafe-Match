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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
const promotions_service_1 = require("../promotions/promotions.service");
let AdminService = class AdminService {
    promotionsRepo;
    promotionsService;
    constructor(promotionsRepo, promotionsService) {
        this.promotionsRepo = promotionsRepo;
        this.promotionsService = promotionsService;
    }
    async getPendingPromotions() {
        return this.promotionsRepo.find({
            where: { status: 'pending_review' },
            relations: ['package', 'cafe'],
            order: { createdAt: 'ASC' },
        });
    }
    async approvePromotion(promotionId) {
        return this.promotionsService.activatePromotion(promotionId);
    }
    async rejectPromotion(promotionId, reason) {
        return this.promotionsService.rejectPromotion(promotionId, reason);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(promotion_entity_1.Promotion)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        promotions_service_1.PromotionsService])
], AdminService);
//# sourceMappingURL=admin.service.js.map