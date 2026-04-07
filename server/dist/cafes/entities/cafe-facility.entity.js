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
exports.CafeFacility = void 0;
const typeorm_1 = require("typeorm");
const cafe_entity_1 = require("./cafe.entity");
let CafeFacility = class CafeFacility {
    id;
    cafeId;
    facilityKey;
    facilityValue;
    cafe;
};
exports.CafeFacility = CafeFacility;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], CafeFacility.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cafe_id', unsigned: true }),
    __metadata("design:type", Number)
], CafeFacility.prototype, "cafeId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'facility_key', length: 50 }),
    __metadata("design:type", String)
], CafeFacility.prototype, "facilityKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'facility_value', length: 255, nullable: true }),
    __metadata("design:type", String)
], CafeFacility.prototype, "facilityValue", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cafe_entity_1.Cafe, (cafe) => cafe.facilities, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cafe_id' }),
    __metadata("design:type", cafe_entity_1.Cafe)
], CafeFacility.prototype, "cafe", void 0);
exports.CafeFacility = CafeFacility = __decorate([
    (0, typeorm_1.Entity)('cafe_facilities'),
    (0, typeorm_1.Unique)(['cafe', 'facilityKey'])
], CafeFacility);
//# sourceMappingURL=cafe-facility.entity.js.map