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
exports.ReviewMedia = void 0;
const typeorm_1 = require("typeorm");
const review_entity_1 = require("./review.entity");
let ReviewMedia = class ReviewMedia {
    id;
    reviewId;
    mediaType;
    url;
    displayOrder;
    createdAt;
    review;
};
exports.ReviewMedia = ReviewMedia;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], ReviewMedia.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'review_id', unsigned: true }),
    __metadata("design:type", Number)
], ReviewMedia.prototype, "reviewId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_type', type: 'enum', enum: ['photo', 'video'] }),
    __metadata("design:type", String)
], ReviewMedia.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 1000 }),
    __metadata("design:type", String)
], ReviewMedia.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_order', type: 'smallint', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ReviewMedia.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], ReviewMedia.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => review_entity_1.Review, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'review_id' }),
    __metadata("design:type", review_entity_1.Review)
], ReviewMedia.prototype, "review", void 0);
exports.ReviewMedia = ReviewMedia = __decorate([
    (0, typeorm_1.Entity)('review_media')
], ReviewMedia);
//# sourceMappingURL=review-media.entity.js.map