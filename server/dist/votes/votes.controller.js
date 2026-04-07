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
exports.VotesController = void 0;
const common_1 = require("@nestjs/common");
const votes_service_1 = require("./votes.service");
const cast_vote_dto_1 = require("./dto/cast-vote.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const public_decorator_1 = require("../common/decorators/public.decorator");
let VotesController = class VotesController {
    votesService;
    constructor(votesService) {
        this.votesService = votesService;
    }
    castVote(req, cafeId, dto) {
        return this.votesService.castVote(req.user.id, cafeId, dto.purposeIds);
    }
    getTallies(cafeId) {
        return this.votesService.getTallies(cafeId);
    }
    getMyVotes(req, cafeId) {
        return this.votesService.getUserVotes(req.user.id, cafeId);
    }
};
exports.VotesController = VotesController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':cafeId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('cafeId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, cast_vote_dto_1.CastVoteDto]),
    __metadata("design:returntype", void 0)
], VotesController.prototype, "castVote", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':cafeId'),
    __param(0, (0, common_1.Param)('cafeId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], VotesController.prototype, "getTallies", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':cafeId/me'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('cafeId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], VotesController.prototype, "getMyVotes", null);
exports.VotesController = VotesController = __decorate([
    (0, common_1.Controller)('votes'),
    __metadata("design:paramtypes", [votes_service_1.VotesService])
], VotesController);
//# sourceMappingURL=votes.controller.js.map