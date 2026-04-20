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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendsController = void 0;
const common_1 = require("@nestjs/common");
const friends_service_1 = require("./friends.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const class_validator_1 = require("class-validator");
class SendRequestDto {
    friendCode;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendRequestDto.prototype, "friendCode", void 0);
class ThrowEmojiDto {
    emoji;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ThrowEmojiDto.prototype, "emoji", void 0);
let FriendsController = class FriendsController {
    friendsService;
    constructor(friendsService) {
        this.friendsService = friendsService;
    }
    sendRequest(user, dto) {
        return this.friendsService.sendRequest(user.id, dto.friendCode);
    }
    accept(user, id) {
        return this.friendsService.acceptRequest(user.id, id);
    }
    reject(user, id) {
        return this.friendsService.rejectRequest(user.id, id);
    }
    pending(user) {
        return this.friendsService.pendingRequests(user.id);
    }
    list(user) {
        return this.friendsService.friendList(user.id);
    }
    map(user) {
        return this.friendsService.friendsOnMap(user.id);
    }
    throwEmoji(user, friendId, dto) {
        return this.friendsService.throwEmoji(user.id, friendId, dto.emoji);
    }
};
exports.FriendsController = FriendsController;
__decorate([
    (0, common_1.Post)('request'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SendRequestDto]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "sendRequest", null);
__decorate([
    (0, common_1.Put)('request/:id/accept'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "accept", null);
__decorate([
    (0, common_1.Put)('request/:id/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "reject", null);
__decorate([
    (0, common_1.Get)('requests/pending'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "pending", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('map'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "map", null);
__decorate([
    (0, common_1.Post)(':friendId/emoji'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('friendId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, ThrowEmojiDto]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "throwEmoji", null);
exports.FriendsController = FriendsController = __decorate([
    (0, common_1.Controller)('friends'),
    __metadata("design:paramtypes", [friends_service_1.FriendsService])
], FriendsController);
//# sourceMappingURL=friends.controller.js.map