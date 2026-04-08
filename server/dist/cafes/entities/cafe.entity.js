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
exports.Cafe = void 0;
const typeorm_1 = require("typeorm");
const cafe_facility_entity_1 = require("./cafe-facility.entity");
const cafe_menu_entity_1 = require("../../menus/entities/cafe-menu.entity");
const cafe_photo_entity_1 = require("../../photos/entities/cafe-photo.entity");
const bookmark_entity_1 = require("../../bookmarks/entities/bookmark.entity");
const favorite_entity_1 = require("../../favorites/entities/favorite.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let Cafe = class Cafe {
    id;
    name;
    slug;
    description;
    address;
    latitude;
    longitude;
    phone;
    googlePlaceId;
    googleMapsUrl;
    wifiAvailable;
    wifiSpeedMbps;
    hasMushola;
    openingHours;
    priceRange;
    bookmarksCount;
    favoritesCount;
    ownerId;
    hasActivePromotion;
    activePromotionType;
    isActive;
    createdAt;
    updatedAt;
    owner;
    facilities;
    menus;
    photos;
    bookmarks;
    favorites;
    distanceMeters;
    matchScore;
};
exports.Cafe = Cafe;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], Cafe.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], Cafe.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, unique: true }),
    __metadata("design:type", String)
], Cafe.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Cafe.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500 }),
    __metadata("design:type", String)
], Cafe.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 8 }),
    __metadata("design:type", Number)
], Cafe.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 11, scale: 8 }),
    __metadata("design:type", Number)
], Cafe.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], Cafe.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'google_place_id', length: 255, nullable: true }),
    __metadata("design:type", String)
], Cafe.prototype, "googlePlaceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'google_maps_url', length: 500, nullable: true }),
    __metadata("design:type", String)
], Cafe.prototype, "googleMapsUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wifi_available', default: false }),
    __metadata("design:type", Boolean)
], Cafe.prototype, "wifiAvailable", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'wifi_speed_mbps',
        type: 'smallint',
        unsigned: true,
        nullable: true,
    }),
    __metadata("design:type", Number)
], Cafe.prototype, "wifiSpeedMbps", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'has_mushola', default: false }),
    __metadata("design:type", Boolean)
], Cafe.prototype, "hasMushola", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opening_hours', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Cafe.prototype, "openingHours", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'price_range',
        type: 'enum',
        enum: ['$', '$$', '$$$'],
        default: '$$',
    }),
    __metadata("design:type", String)
], Cafe.prototype, "priceRange", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bookmarks_count', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], Cafe.prototype, "bookmarksCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'favorites_count', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], Cafe.prototype, "favoritesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'owner_id', type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], Cafe.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'has_active_promotion', default: false }),
    __metadata("design:type", Boolean)
], Cafe.prototype, "hasActivePromotion", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'active_promotion_type',
        type: 'enum',
        enum: ['new_cafe', 'featured_promo'],
        nullable: true,
    }),
    __metadata("design:type", String)
], Cafe.prototype, "activePromotionType", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], Cafe.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Cafe.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Cafe.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'owner_id' }),
    __metadata("design:type", user_entity_1.User)
], Cafe.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => cafe_facility_entity_1.CafeFacility, (facility) => facility.cafe, { cascade: true }),
    __metadata("design:type", Array)
], Cafe.prototype, "facilities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => cafe_menu_entity_1.CafeMenu, (menu) => menu.cafe),
    __metadata("design:type", Array)
], Cafe.prototype, "menus", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => cafe_photo_entity_1.CafePhoto, (photo) => photo.cafe),
    __metadata("design:type", Array)
], Cafe.prototype, "photos", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => bookmark_entity_1.Bookmark, (bookmark) => bookmark.cafe),
    __metadata("design:type", Array)
], Cafe.prototype, "bookmarks", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => favorite_entity_1.Favorite, (favorite) => favorite.cafe),
    __metadata("design:type", Array)
], Cafe.prototype, "favorites", void 0);
exports.Cafe = Cafe = __decorate([
    (0, typeorm_1.Entity)('cafes')
], Cafe);
//# sourceMappingURL=cafe.entity.js.map