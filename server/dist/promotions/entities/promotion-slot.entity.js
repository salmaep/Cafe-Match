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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionSlot = void 0;
const typeorm_1 = require("typeorm");
const advertisement_package_entity_1 = require("./advertisement-package.entity");
let PromotionSlot = class PromotionSlot {
    id;
    packageId;
    promotionType;
    month;
    totalSlots;
    usedSlots;
    reservedSlots;
    package;
};
exports.PromotionSlot = PromotionSlot;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], PromotionSlot.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'package_id', type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], PromotionSlot.prototype, "packageId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'promotion_type',
        type: 'enum',
        enum: ['new_cafe', 'featured_promo'],
    }),
    __metadata("design:type", String)
], PromotionSlot.prototype, "promotionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 7 }),
    __metadata("design:type", String)
], PromotionSlot.prototype, "month", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_slots', type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], PromotionSlot.prototype, "totalSlots", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'used_slots', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], PromotionSlot.prototype, "usedSlots", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reserved_slots', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], PromotionSlot.prototype, "reservedSlots", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => advertisement_package_entity_1.AdvertisementPackage, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'package_id' }),
    __metadata("design:type", advertisement_package_entity_1.AdvertisementPackage)
], PromotionSlot.prototype, "package", void 0);
exports.PromotionSlot = PromotionSlot = __decorate([
    (0, typeorm_1.Entity)('promotion_slots')
], PromotionSlot);
//# sourceMappingURL=promotion-slot.entity.js.map