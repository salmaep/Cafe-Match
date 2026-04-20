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
exports.Achievement = void 0;
const typeorm_1 = require("typeorm");
let Achievement = class Achievement {
    id;
    slug;
    name;
    description;
    category;
    tier;
    threshold;
    purposeSlug;
    iconUrl;
};
exports.Achievement = Achievement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], Achievement.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, unique: true }),
    __metadata("design:type", String)
], Achievement.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], Achievement.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Achievement.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['visit_purpose', 'visit_general', 'social', 'streak', 'special'],
    }),
    __metadata("design:type", String)
], Achievement.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['bronze_1', 'bronze_2', 'silver_1', 'silver_2', 'gold_1', 'gold_2', 'platinum'],
    }),
    __metadata("design:type", String)
], Achievement.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.Column)({ unsigned: true }),
    __metadata("design:type", Number)
], Achievement.prototype, "threshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purpose_slug', length: 50, nullable: true }),
    __metadata("design:type", String)
], Achievement.prototype, "purposeSlug", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'icon_url', length: 500, nullable: true }),
    __metadata("design:type", String)
], Achievement.prototype, "iconUrl", void 0);
exports.Achievement = Achievement = __decorate([
    (0, typeorm_1.Entity)('achievements')
], Achievement);
//# sourceMappingURL=achievement.entity.js.map