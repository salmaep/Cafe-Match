"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const friends_controller_1 = require("./friends.controller");
const friends_service_1 = require("./friends.service");
const friend_request_entity_1 = require("./entities/friend-request.entity");
const friendship_entity_1 = require("./entities/friendship.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notifications_module_1 = require("../notifications/notifications.module");
const achievements_module_1 = require("../achievements/achievements.module");
let FriendsModule = class FriendsModule {
};
exports.FriendsModule = FriendsModule;
exports.FriendsModule = FriendsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([friend_request_entity_1.FriendRequest, friendship_entity_1.Friendship, user_entity_1.User]),
            notifications_module_1.NotificationsModule,
            achievements_module_1.AchievementsModule,
        ],
        controllers: [friends_controller_1.FriendsController],
        providers: [friends_service_1.FriendsService],
        exports: [friends_service_1.FriendsService],
    })
], FriendsModule);
//# sourceMappingURL=friends.module.js.map