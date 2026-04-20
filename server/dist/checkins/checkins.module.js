"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckinsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const checkins_controller_1 = require("./checkins.controller");
const checkins_service_1 = require("./checkins.service");
const checkin_entity_1 = require("./entities/checkin.entity");
const user_streak_entity_1 = require("./entities/user-streak.entity");
const cafe_entity_1 = require("../cafes/entities/cafe.entity");
const achievements_module_1 = require("../achievements/achievements.module");
const notifications_module_1 = require("../notifications/notifications.module");
let CheckinsModule = class CheckinsModule {
};
exports.CheckinsModule = CheckinsModule;
exports.CheckinsModule = CheckinsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([checkin_entity_1.Checkin, user_streak_entity_1.UserStreak, cafe_entity_1.Cafe]),
            achievements_module_1.AchievementsModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [checkins_controller_1.CheckinsController],
        providers: [checkins_service_1.CheckinsService],
        exports: [checkins_service_1.CheckinsService],
    })
], CheckinsModule);
//# sourceMappingURL=checkins.module.js.map