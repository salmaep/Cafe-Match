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
exports.AdvertisementPackage = void 0;
const typeorm_1 = require("typeorm");
let AdvertisementPackage = class AdvertisementPackage {
    id;
    name;
    slug;
    priceMonthly;
    priceAnnual;
    monthlySlots;
    annualReservedSlots;
    sessionFrequency;
    displayOrder;
    benefits;
    isActive;
    createdAt;
    updatedAt;
};
exports.AdvertisementPackage = AdvertisementPackage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], AdvertisementPackage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], AdvertisementPackage.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, unique: true }),
    __metadata("design:type", String)
], AdvertisementPackage.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_monthly', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], AdvertisementPackage.prototype, "priceMonthly", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_annual', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], AdvertisementPackage.prototype, "priceAnnual", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'monthly_slots', type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], AdvertisementPackage.prototype, "monthlySlots", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'annual_reserved_slots', type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], AdvertisementPackage.prototype, "annualReservedSlots", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_frequency', length: 100 }),
    __metadata("design:type", String)
], AdvertisementPackage.prototype, "sessionFrequency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_order', type: 'smallint', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], AdvertisementPackage.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], AdvertisementPackage.prototype, "benefits", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], AdvertisementPackage.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AdvertisementPackage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], AdvertisementPackage.prototype, "updatedAt", void 0);
exports.AdvertisementPackage = AdvertisementPackage = __decorate([
    (0, typeorm_1.Entity)('advertisement_packages')
], AdvertisementPackage);
//# sourceMappingURL=advertisement-package.entity.js.map