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
exports.CafeAnalytics = void 0;
const typeorm_1 = require("typeorm");
const cafe_entity_1 = require("../../cafes/entities/cafe.entity");
let CafeAnalytics = class CafeAnalytics {
    id;
    cafeId;
    promotionId;
    eventType;
    createdAt;
    cafe;
};
exports.CafeAnalytics = CafeAnalytics;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", Number)
], CafeAnalytics.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cafe_id', type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], CafeAnalytics.prototype, "cafeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'promotion_id', type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], CafeAnalytics.prototype, "promotionId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'event_type',
        type: 'enum',
        enum: ['view', 'click'],
    }),
    __metadata("design:type", String)
], CafeAnalytics.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CafeAnalytics.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cafe_entity_1.Cafe, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cafe_id' }),
    __metadata("design:type", cafe_entity_1.Cafe)
], CafeAnalytics.prototype, "cafe", void 0);
exports.CafeAnalytics = CafeAnalytics = __decorate([
    (0, typeorm_1.Entity)('cafe_analytics')
], CafeAnalytics);
//# sourceMappingURL=cafe-analytics.entity.js.map