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
exports.PromotionsController = void 0;
const common_1 = require("@nestjs/common");
const promotions_service_1 = require("./promotions.service");
const create_promotion_dto_1 = require("./dto/create-promotion.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
let PromotionsController = class PromotionsController {
    promotionsService;
    constructor(promotionsService) {
        this.promotionsService = promotionsService;
    }
    getPackages() {
        return this.promotionsService.getPackages();
    }
    getActivePromotions(type) {
        return this.promotionsService.getActivePromotions(type);
    }
    getAvailability(packageId, type) {
        return this.promotionsService.getAvailability(packageId, type || 'new_cafe');
    }
    createPromotion(req, dto) {
        return this.promotionsService.createPromotion(req.user.id, dto);
    }
    getMyPromotions(req) {
        return this.promotionsService.getMyPromotions(req.user.id);
    }
    getPromotion(id, req) {
        return this.promotionsService.getPromotionById(id, req.user.id);
    }
    updateContent(id, req, dto) {
        return this.promotionsService.updateContent(id, req.user.id, dto);
    }
};
exports.PromotionsController = PromotionsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('packages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "getPackages", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('active'),
    __param(0, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "getActivePromotions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner'),
    (0, common_1.Get)('packages/:id/availability'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "getAvailability", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_promotion_dto_1.CreatePromotionDto]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "createPromotion", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner'),
    (0, common_1.Get)('mine'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "getMyPromotions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "getPromotion", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner'),
    (0, common_1.Put)(':id/content'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, create_promotion_dto_1.UpdatePromotionContentDto]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "updateContent", null);
exports.PromotionsController = PromotionsController = __decorate([
    (0, common_1.Controller)('promotions'),
    __metadata("design:paramtypes", [promotions_service_1.PromotionsService])
], PromotionsController);
//# sourceMappingURL=promotions.controller.js.map