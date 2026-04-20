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
exports.CheckinsController = void 0;
const common_1 = require("@nestjs/common");
const checkins_service_1 = require("./checkins.service");
const checkin_dto_1 = require("./dto/checkin.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
let CheckinsController = class CheckinsController {
    checkinsService;
    constructor(checkinsService) {
        this.checkinsService = checkinsService;
    }
    checkIn(user, dto) {
        return this.checkinsService.checkIn(user.id, dto);
    }
    checkOut(user, dto) {
        return this.checkinsService.checkOut(user.id, dto);
    }
    getActive(user) {
        return this.checkinsService.getActive(user.id);
    }
    history(user, page, limit) {
        return this.checkinsService.history(user.id, page || 1, limit || 20);
    }
    leaderboard(cafeId) {
        return this.checkinsService.leaderboard(cafeId);
    }
    streak(user) {
        return this.checkinsService.getStreak(user.id);
    }
    globalLeaderboard() {
        return this.checkinsService.globalLeaderboard();
    }
};
exports.CheckinsController = CheckinsController;
__decorate([
    (0, common_1.Post)('in'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, checkin_dto_1.CheckInDto]),
    __metadata("design:returntype", void 0)
], CheckinsController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Post)('out'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, checkin_dto_1.CheckOutDto]),
    __metadata("design:returntype", void 0)
], CheckinsController.prototype, "checkOut", null);
__decorate([
    (0, common_1.Get)('active'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CheckinsController.prototype, "getActive", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], CheckinsController.prototype, "history", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('cafe/:cafeId/leaderboard'),
    __param(0, (0, common_1.Param)('cafeId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CheckinsController.prototype, "leaderboard", null);
__decorate([
    (0, common_1.Get)('streak'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CheckinsController.prototype, "streak", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('global-leaderboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CheckinsController.prototype, "globalLeaderboard", null);
exports.CheckinsController = CheckinsController = __decorate([
    (0, common_1.Controller)('checkins'),
    __metadata("design:paramtypes", [checkins_service_1.CheckinsService])
], CheckinsController);
//# sourceMappingURL=checkins.controller.js.map