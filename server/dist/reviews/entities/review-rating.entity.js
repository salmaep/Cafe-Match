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
exports.ReviewRating = void 0;
const typeorm_1 = require("typeorm");
const review_entity_1 = require("./review.entity");
let ReviewRating = class ReviewRating {
    id;
    reviewId;
    category;
    score;
    review;
};
exports.ReviewRating = ReviewRating;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], ReviewRating.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'review_id', unsigned: true }),
    __metadata("design:type", Number)
], ReviewRating.prototype, "reviewId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], ReviewRating.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'tinyint', unsigned: true }),
    __metadata("design:type", Number)
], ReviewRating.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => review_entity_1.Review, (r) => r.ratings, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'review_id' }),
    __metadata("design:type", review_entity_1.Review)
], ReviewRating.prototype, "review", void 0);
exports.ReviewRating = ReviewRating = __decorate([
    (0, typeorm_1.Entity)('review_ratings'),
    (0, typeorm_1.Index)('idx_rating_review_cat', ['reviewId', 'category'], { unique: true })
], ReviewRating);
//# sourceMappingURL=review-rating.entity.js.map