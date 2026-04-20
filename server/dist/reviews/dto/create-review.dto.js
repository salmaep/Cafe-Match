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
exports.UpdateReviewDto = exports.CreateReviewDto = exports.MediaDto = exports.RatingDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class RatingDto {
    category;
    score;
}
exports.RatingDto = RatingDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RatingDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], RatingDto.prototype, "score", void 0);
class MediaDto {
    mediaType;
    url;
}
exports.MediaDto = MediaDto;
__decorate([
    (0, class_validator_1.IsIn)(['photo', 'video']),
    __metadata("design:type", String)
], MediaDto.prototype, "mediaType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MediaDto.prototype, "url", void 0);
class CreateReviewDto {
    text;
    ratings;
    media;
}
exports.CreateReviewDto = CreateReviewDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RatingDto),
    __metadata("design:type", Array)
], CreateReviewDto.prototype, "ratings", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MediaDto),
    __metadata("design:type", Array)
], CreateReviewDto.prototype, "media", void 0);
class UpdateReviewDto extends CreateReviewDto {
}
exports.UpdateReviewDto = UpdateReviewDto;
//# sourceMappingURL=create-review.dto.js.map