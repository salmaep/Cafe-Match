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
exports.VotesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cafe_vote_entity_1 = require("./entities/cafe-vote.entity");
let VotesService = class VotesService {
    votesRepository;
    constructor(votesRepository) {
        this.votesRepository = votesRepository;
    }
    async castVote(userId, cafeId, purposeIds) {
        if (purposeIds.length > 3) {
            throw new common_1.BadRequestException('You can vote for up to 3 categories');
        }
        await this.votesRepository.delete({ userId, cafeId });
        const votes = purposeIds.map((purposeId) => this.votesRepository.create({ userId, cafeId, purposeId }));
        await this.votesRepository.save(votes);
        return { voted: purposeIds };
    }
    async getTallies(cafeId) {
        const results = await this.votesRepository
            .createQueryBuilder('v')
            .select('v.purpose_id', 'purposeId')
            .addSelect('COUNT(*)', 'count')
            .where('v.cafe_id = :cafeId', { cafeId })
            .groupBy('v.purpose_id')
            .getRawMany();
        return results.map((r) => ({
            purposeId: Number(r.purposeId),
            count: Number(r.count),
        }));
    }
    async getUserVotes(userId, cafeId) {
        const votes = await this.votesRepository.find({
            where: { userId, cafeId },
        });
        return votes.map((v) => v.purposeId);
    }
};
exports.VotesService = VotesService;
exports.VotesService = VotesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cafe_vote_entity_1.CafeVote)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], VotesService);
//# sourceMappingURL=votes.service.js.map