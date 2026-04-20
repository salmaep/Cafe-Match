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
exports.UserStreak = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const cafe_entity_1 = require("../../cafes/entities/cafe.entity");
let UserStreak = class UserStreak {
    id;
    userId;
    cafeId;
    streakType;
    currentStreak;
    longestStreak;
    lastCheckinDate;
    user;
    cafe;
};
exports.UserStreak = UserStreak;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], UserStreak.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', unsigned: true }),
    __metadata("design:type", Number)
], UserStreak.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cafe_id', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], UserStreak.prototype, "cafeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'streak_type', type: 'enum', enum: ['cafe', 'global'], default: 'global' }),
    __metadata("design:type", String)
], UserStreak.prototype, "streakType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_streak', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], UserStreak.prototype, "currentStreak", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'longest_streak', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], UserStreak.prototype, "longestStreak", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_checkin_date', type: 'date' }),
    __metadata("design:type", String)
], UserStreak.prototype, "lastCheckinDate", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserStreak.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cafe_entity_1.Cafe, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'cafe_id' }),
    __metadata("design:type", cafe_entity_1.Cafe)
], UserStreak.prototype, "cafe", void 0);
exports.UserStreak = UserStreak = __decorate([
    (0, typeorm_1.Entity)('user_streaks'),
    (0, typeorm_1.Index)('idx_streak_user_cafe', ['userId', 'cafeId', 'streakType'], { unique: true })
], UserStreak);
//# sourceMappingURL=user-streak.entity.js.map