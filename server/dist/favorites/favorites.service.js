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
exports.FavoritesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const favorite_entity_1 = require("./entities/favorite.entity");
const cafe_entity_1 = require("../cafes/entities/cafe.entity");
let FavoritesService = class FavoritesService {
    favoritesRepository;
    dataSource;
    constructor(favoritesRepository, dataSource) {
        this.favoritesRepository = favoritesRepository;
        this.dataSource = dataSource;
    }
    async toggle(userId, cafeId) {
        return this.dataSource.transaction(async (manager) => {
            const existing = await manager.findOne(favorite_entity_1.Favorite, {
                where: { userId, cafeId },
            });
            if (existing) {
                await manager.remove(existing);
                await manager.decrement(cafe_entity_1.Cafe, { id: cafeId }, 'favoritesCount', 1);
                return { favorited: false };
            }
            else {
                await manager.save(favorite_entity_1.Favorite, { userId, cafeId });
                await manager.increment(cafe_entity_1.Cafe, { id: cafeId }, 'favoritesCount', 1);
                return { favorited: true };
            }
        });
    }
    async findByUser(userId) {
        return this.favoritesRepository.find({
            where: { userId },
            relations: ['cafe'],
            order: { createdAt: 'DESC' },
        });
    }
};
exports.FavoritesService = FavoritesService;
exports.FavoritesService = FavoritesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(favorite_entity_1.Favorite)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], FavoritesService);
//# sourceMappingURL=favorites.service.js.map