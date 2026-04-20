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
exports.Review = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const cafe_entity_1 = require("../../cafes/entities/cafe.entity");
const review_rating_entity_1 = require("./review-rating.entity");
const review_media_entity_1 = require("./review-media.entity");
let Review = class Review {
    id;
    userId;
    cafeId;
    text;
    createdAt;
    updatedAt;
    user;
    cafe;
    ratings;
    media;
};
exports.Review = Review;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], Review.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', unsigned: true }),
    __metadata("design:type", Number)
], Review.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cafe_id', unsigned: true }),
    __metadata("design:type", Number)
], Review.prototype, "cafeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Review.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Review.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Review.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Review.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cafe_entity_1.Cafe, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cafe_id' }),
    __metadata("design:type", cafe_entity_1.Cafe)
], Review.prototype, "cafe", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => review_rating_entity_1.ReviewRating, (r) => r.review, { cascade: true, eager: true }),
    __metadata("design:type", Array)
], Review.prototype, "ratings", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => review_media_entity_1.ReviewMedia, (m) => m.review, { cascade: true, eager: true }),
    __metadata("design:type", Array)
], Review.prototype, "media", void 0);
exports.Review = Review = __decorate([
    (0, typeorm_1.Entity)('reviews'),
    (0, typeorm_1.Index)('idx_review_user_cafe', ['userId', 'cafeId'], { unique: true })
], Review);
//# sourceMappingURL=review.entity.js.map