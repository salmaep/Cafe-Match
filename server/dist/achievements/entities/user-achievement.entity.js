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
exports.UserAchievement = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const achievement_entity_1 = require("./achievement.entity");
let UserAchievement = class UserAchievement {
    id;
    userId;
    achievementId;
    progress;
    unlockedAt;
    user;
    achievement;
};
exports.UserAchievement = UserAchievement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], UserAchievement.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', unsigned: true }),
    __metadata("design:type", Number)
], UserAchievement.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'achievement_id', unsigned: true }),
    __metadata("design:type", Number)
], UserAchievement.prototype, "achievementId", void 0);
__decorate([
    (0, typeorm_1.Column)({ unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], UserAchievement.prototype, "progress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unlocked_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], UserAchievement.prototype, "unlockedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserAchievement.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => achievement_entity_1.Achievement, { onDelete: 'CASCADE', eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'achievement_id' }),
    __metadata("design:type", achievement_entity_1.Achievement)
], UserAchievement.prototype, "achievement", void 0);
exports.UserAchievement = UserAchievement = __decorate([
    (0, typeorm_1.Entity)('user_achievements'),
    (0, typeorm_1.Index)('idx_user_achievement', ['userId', 'achievementId'], { unique: true })
], UserAchievement);
//# sourceMappingURL=user-achievement.entity.js.map