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
exports.FriendRequest = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let FriendRequest = class FriendRequest {
    id;
    senderId;
    receiverId;
    status;
    createdAt;
    updatedAt;
    sender;
    receiver;
};
exports.FriendRequest = FriendRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], FriendRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_id', unsigned: true }),
    __metadata("design:type", Number)
], FriendRequest.prototype, "senderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'receiver_id', unsigned: true }),
    __metadata("design:type", Number)
], FriendRequest.prototype, "receiverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['pending', 'accepted', 'rejected'], default: 'pending' }),
    __metadata("design:type", String)
], FriendRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], FriendRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], FriendRequest.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'sender_id' }),
    __metadata("design:type", user_entity_1.User)
], FriendRequest.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'receiver_id' }),
    __metadata("design:type", user_entity_1.User)
], FriendRequest.prototype, "receiver", void 0);
exports.FriendRequest = FriendRequest = __decorate([
    (0, typeorm_1.Entity)('friend_requests'),
    (0, typeorm_1.Index)('idx_friend_pair', ['senderId', 'receiverId'], { unique: true })
], FriendRequest);
//# sourceMappingURL=friend-request.entity.js.map