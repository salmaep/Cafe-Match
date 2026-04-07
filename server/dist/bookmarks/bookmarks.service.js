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
exports.BookmarksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bookmark_entity_1 = require("./entities/bookmark.entity");
const cafe_entity_1 = require("../cafes/entities/cafe.entity");
let BookmarksService = class BookmarksService {
    bookmarksRepository;
    dataSource;
    constructor(bookmarksRepository, dataSource) {
        this.bookmarksRepository = bookmarksRepository;
        this.dataSource = dataSource;
    }
    async toggle(userId, cafeId) {
        return this.dataSource.transaction(async (manager) => {
            const existing = await manager.findOne(bookmark_entity_1.Bookmark, {
                where: { userId, cafeId },
            });
            if (existing) {
                await manager.remove(existing);
                await manager.decrement(cafe_entity_1.Cafe, { id: cafeId }, 'bookmarksCount', 1);
                return { bookmarked: false };
            }
            else {
                await manager.save(bookmark_entity_1.Bookmark, { userId, cafeId });
                await manager.increment(cafe_entity_1.Cafe, { id: cafeId }, 'bookmarksCount', 1);
                return { bookmarked: true };
            }
        });
    }
    async findByUser(userId) {
        return this.bookmarksRepository.find({
            where: { userId },
            relations: ['cafe'],
            order: { createdAt: 'DESC' },
        });
    }
    async isBookmarked(userId, cafeId) {
        const count = await this.bookmarksRepository.count({
            where: { userId, cafeId },
        });
        return count > 0;
    }
};
exports.BookmarksService = BookmarksService;
exports.BookmarksService = BookmarksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bookmark_entity_1.Bookmark)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], BookmarksService);
//# sourceMappingURL=bookmarks.service.js.map