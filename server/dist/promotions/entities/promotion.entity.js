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
exports.Promotion = void 0;
const typeorm_1 = require("typeorm");
const cafe_entity_1 = require("../../cafes/entities/cafe.entity");
const advertisement_package_entity_1 = require("./advertisement-package.entity");
let Promotion = class Promotion {
    id;
    cafeId;
    packageId;
    type;
    billingCycle;
    status;
    rejectionReason;
    contentTitle;
    contentDescription;
    contentPhotoUrl;
    highlightedFacilities;
    startedAt;
    expiresAt;
    createdAt;
    updatedAt;
    cafe;
    package;
};
exports.Promotion = Promotion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], Promotion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cafe_id', type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], Promotion.prototype, "cafeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'package_id', type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], Promotion.prototype, "packageId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['new_cafe', 'featured_promo'],
    }),
    __metadata("design:type", String)
], Promotion.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'billing_cycle',
        type: 'enum',
        enum: ['monthly', 'annual'],
        default: 'monthly',
    }),
    __metadata("design:type", String)
], Promotion.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending_review', 'active', 'rejected', 'expired', 'pending_payment'],
        default: 'pending_payment',
    }),
    __metadata("design:type", String)
], Promotion.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejection_reason', length: 500, nullable: true }),
    __metadata("design:type", String)
], Promotion.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content_title', length: 255, nullable: true }),
    __metadata("design:type", String)
], Promotion.prototype, "contentTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content_description', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Promotion.prototype, "contentDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content_photo_url', length: 1000, nullable: true }),
    __metadata("design:type", String)
], Promotion.prototype, "contentPhotoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'highlighted_facilities', type: 'json', nullable: true }),
    __metadata("design:type", Array)
], Promotion.prototype, "highlightedFacilities", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Promotion.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Promotion.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Promotion.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Promotion.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cafe_entity_1.Cafe, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cafe_id' }),
    __metadata("design:type", cafe_entity_1.Cafe)
], Promotion.prototype, "cafe", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => advertisement_package_entity_1.AdvertisementPackage),
    (0, typeorm_1.JoinColumn)({ name: 'package_id' }),
    __metadata("design:type", advertisement_package_entity_1.AdvertisementPackage)
], Promotion.prototype, "package", void 0);
exports.Promotion = Promotion = __decorate([
    (0, typeorm_1.Entity)('promotions')
], Promotion);
//# sourceMappingURL=promotion.entity.js.map