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
exports.Checkin = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const cafe_entity_1 = require("../../cafes/entities/cafe.entity");
let Checkin = class Checkin {
    id;
    userId;
    cafeId;
    checkInAt;
    checkOutAt;
    durationMinutes;
    verified;
    user;
    cafe;
};
exports.Checkin = Checkin;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], Checkin.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', unsigned: true }),
    __metadata("design:type", Number)
], Checkin.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cafe_id', unsigned: true }),
    __metadata("design:type", Number)
], Checkin.prototype, "cafeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], Checkin.prototype, "checkInAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Checkin.prototype, "checkOutAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'duration_minutes', type: 'smallint', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], Checkin.prototype, "durationMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Checkin.prototype, "verified", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Checkin.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cafe_entity_1.Cafe, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cafe_id' }),
    __metadata("design:type", cafe_entity_1.Cafe)
], Checkin.prototype, "cafe", void 0);
exports.Checkin = Checkin = __decorate([
    (0, typeorm_1.Entity)('checkins')
], Checkin);
//# sourceMappingURL=checkin.entity.js.map