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
exports.UpdatePromotionContentDto = exports.CreatePromotionDto = void 0;
const class_validator_1 = require("class-validator");
class CreatePromotionDto {
    packageId;
    type;
    billingCycle;
    contentTitle;
    contentDescription;
    contentPhotoUrl;
    highlightedFacilities;
}
exports.CreatePromotionDto = CreatePromotionDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreatePromotionDto.prototype, "packageId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['new_cafe', 'featured_promo']),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['monthly', 'annual']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "billingCycle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "contentTitle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "contentDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePromotionDto.prototype, "contentPhotoUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreatePromotionDto.prototype, "highlightedFacilities", void 0);
class UpdatePromotionContentDto {
    contentTitle;
    contentDescription;
    contentPhotoUrl;
    highlightedFacilities;
}
exports.UpdatePromotionContentDto = UpdatePromotionContentDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePromotionContentDto.prototype, "contentTitle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePromotionContentDto.prototype, "contentDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePromotionContentDto.prototype, "contentPhotoUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], UpdatePromotionContentDto.prototype, "highlightedFacilities", void 0);
//# sourceMappingURL=create-promotion.dto.js.map