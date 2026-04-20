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
exports.Friendship = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let Friendship = class Friendship {
    id;
    userAId;
    userBId;
    createdAt;
    userA;
    userB;
};
exports.Friendship = Friendship;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], Friendship.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_a_id', unsigned: true }),
    __metadata("design:type", Number)
], Friendship.prototype, "userAId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_b_id', unsigned: true }),
    __metadata("design:type", Number)
], Friendship.prototype, "userBId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], Friendship.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_a_id' }),
    __metadata("design:type", user_entity_1.User)
], Friendship.prototype, "userA", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_b_id' }),
    __metadata("design:type", user_entity_1.User)
], Friendship.prototype, "userB", void 0);
exports.Friendship = Friendship = __decorate([
    (0, typeorm_1.Entity)('friendships'),
    (0, typeorm_1.Index)('idx_friendship_pair', ['userAId', 'userBId'], { unique: true })
], Friendship);
//# sourceMappingURL=friendship.entity.js.map