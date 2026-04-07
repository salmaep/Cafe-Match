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
exports.CafeMenu = void 0;
const typeorm_1 = require("typeorm");
const cafe_entity_1 = require("../../cafes/entities/cafe.entity");
let CafeMenu = class CafeMenu {
    id;
    cafeId;
    category;
    itemName;
    price;
    description;
    isAvailable;
    cafe;
};
exports.CafeMenu = CafeMenu;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], CafeMenu.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'cafe_id', unsigned: true }),
    __metadata("design:type", Number)
], CafeMenu.prototype, "cafeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], CafeMenu.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'item_name', length: 255 }),
    __metadata("design:type", String)
], CafeMenu.prototype, "itemName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], CafeMenu.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, nullable: true }),
    __metadata("design:type", String)
], CafeMenu.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_available', default: true }),
    __metadata("design:type", Boolean)
], CafeMenu.prototype, "isAvailable", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cafe_entity_1.Cafe, (cafe) => cafe.menus, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cafe_id' }),
    __metadata("design:type", cafe_entity_1.Cafe)
], CafeMenu.prototype, "cafe", void 0);
exports.CafeMenu = CafeMenu = __decorate([
    (0, typeorm_1.Entity)('cafe_menus')
], CafeMenu);
//# sourceMappingURL=cafe-menu.entity.js.map