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
exports.CafePhoto = void 0;
const typeorm_1 = require("typeorm");
const cafe_entity_1 = require("../../cafes/entities/cafe.entity");
let CafePhoto = class CafePhoto {
    id;
    cafeId;
    url;
    source;
    googlePhotoRef;
    caption;
    displayOrder;
    isPrimary;
    deletedAt;
    cafe;
};
exports.CafePhoto = CafePhoto;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], CafePhoto.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'cafe_id', unsigned: true }),
    __metadata("design:type", Number)
], CafePhoto.prototype, "cafeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 1000 }),
    __metadata("design:type", String)
], CafePhoto.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['manual', 'google'], default: 'manual' }),
    __metadata("design:type", String)
], CafePhoto.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'google_photo_ref', length: 500, nullable: true }),
    __metadata("design:type", String)
], CafePhoto.prototype, "googlePhotoRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], CafePhoto.prototype, "caption", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_order', type: 'smallint', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], CafePhoto.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_primary', default: false }),
    __metadata("design:type", Boolean)
], CafePhoto.prototype, "isPrimary", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', nullable: true }),
    __metadata("design:type", Object)
], CafePhoto.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cafe_entity_1.Cafe, (cafe) => cafe.photos, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cafe_id' }),
    __metadata("design:type", cafe_entity_1.Cafe)
], CafePhoto.prototype, "cafe", void 0);
exports.CafePhoto = CafePhoto = __decorate([
    (0, typeorm_1.Entity)('cafe_photos')
], CafePhoto);
//# sourceMappingURL=cafe-photo.entity.js.map