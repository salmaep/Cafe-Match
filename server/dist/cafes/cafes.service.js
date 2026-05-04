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
exports.CafesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cafe_entity_1 = require("./entities/cafe.entity");
const cafe_facility_entity_1 = require("./entities/cafe-facility.entity");
const cafe_menu_entity_1 = require("../menus/entities/cafe-menu.entity");
const cafe_photo_entity_1 = require("../photos/entities/cafe-photo.entity");
const review_entity_1 = require("../reviews/entities/review.entity");
const purpose_requirement_entity_1 = require("../purposes/entities/purpose-requirement.entity");
const meili_cafes_service_1 = require("../meili/meili-cafes.service");
let CafesService = class CafesService {
    cafesRepository;
    facilitiesRepository;
    menusRepository;
    photosRepository;
    reviewsRepository;
    requirementsRepository;
    dataSource;
    meiliCafes;
    constructor(cafesRepository, facilitiesRepository, menusRepository, photosRepository, reviewsRepository, requirementsRepository, dataSource, meiliCafes) {
        this.cafesRepository = cafesRepository;
        this.facilitiesRepository = facilitiesRepository;
        this.menusRepository = menusRepository;
        this.photosRepository = photosRepository;
        this.reviewsRepository = reviewsRepository;
        this.requirementsRepository = requirementsRepository;
        this.dataSource = dataSource;
        this.meiliCafes = meiliCafes;
    }
    async search(dto) {
        return this.meiliCafes.searchCafes({
            q: dto.q,
            lat: dto.lat,
            lng: dto.lng,
            radius: dto.radius,
            wifiAvailable: dto.wifiAvailable,
            hasMushola: dto.hasMushola,
            priceRange: dto.priceRange,
            purposeId: dto.purposeId,
            page: dto.page,
            limit: dto.limit,
        });
    }
    async findOne(id) {
        const cafe = await this.cafesRepository.findOne({
            where: { id, isActive: true },
            relations: ['facilities', 'menus', 'photos'],
        });
        if (!cafe)
            throw new common_1.NotFoundException('Cafe not found');
        const facilityKeys = (cafe.facilities || []).map((f) => f.facilityKey);
        const purposeMatchers = await this.loadPurposeMatchers();
        const { purposes, matchScore } = this.computePurposesAndScore(facilityKeys, purposeMatchers);
        const purposeScores = {};
        try {
            const tags = await this.dataSource.query(`SELECT purpose_slug AS purposeSlug, score FROM cafe_purpose_tags WHERE cafe_id = ?`, [id]);
            for (const t of tags)
                purposeScores[t.purposeSlug] = t.score;
        }
        catch {
        }
        let reviewsSummary = [];
        try {
            reviewsSummary = await this.dataSource.query(`SELECT rr.category, ROUND(AVG(rr.score), 1) AS avgScore, COUNT(*) AS count
         FROM review_ratings rr JOIN reviews r ON r.id = rr.review_id
         WHERE r.cafe_id = ? AND r.deleted_at IS NULL GROUP BY rr.category`, [id]);
        }
        catch {
        }
        const googleMapsUrl = cafe.googleMapsUrl || `https://maps.google.com/?q=${cafe.latitude},${cafe.longitude}`;
        return {
            ...cafe,
            latitude: Number(cafe.latitude),
            longitude: Number(cafe.longitude),
            googleMapsUrl,
            googleRating: cafe.googleRating != null ? Number(cafe.googleRating) : null,
            purposes,
            purposeScores,
            detectedFacilities: facilityKeys,
            matchScore,
            reviewsSummary,
        };
    }
    async findPromotedCafes(type) {
        const qb = this.cafesRepository
            .createQueryBuilder('c')
            .leftJoinAndSelect('c.facilities', 'facilities')
            .leftJoinAndSelect('c.photos', 'photos')
            .where('c.isActive = :active', { active: true })
            .andWhere('c.hasActivePromotion = :promoted', { promoted: true });
        if (type) {
            qb.andWhere('c.activePromotionType = :type', { type });
        }
        const cafes = await qb.getMany();
        const promoMap = new Map();
        if (!type || type === 'featured_promo') {
            const cafeIds = cafes
                .filter((c) => c.activePromotionType === 'featured_promo')
                .map((c) => c.id);
            if (cafeIds.length > 0) {
                const promotions = await this.dataSource.query(`SELECT p.cafe_id, p.content_title AS contentTitle, p.content_description AS contentDescription,
                  p.content_photo_url AS contentPhotoUrl,
                  pkg.name AS package_name, pkg.display_order
           FROM promotions p
           JOIN advertisement_packages pkg ON p.package_id = pkg.id
           WHERE p.cafe_id IN (${cafeIds.map(() => '?').join(',')})
             AND p.status = 'active' AND p.expires_at > NOW()
           ORDER BY pkg.display_order DESC`, cafeIds);
                for (const p of promotions) {
                    if (!promoMap.has(p.cafe_id))
                        promoMap.set(p.cafe_id, p);
                }
            }
        }
        const purposeMatchers = await this.loadPurposeMatchers();
        return cafes.map((cafe) => {
            const facilityKeys = (cafe.facilities || []).map((f) => f.facilityKey);
            const { purposes, matchScore } = this.computePurposesAndScore(facilityKeys, purposeMatchers);
            return { ...cafe, purposes, matchScore, promotion: promoMap.get(cafe.id) || null };
        });
    }
    async create(dto) {
        const slug = this.generateSlug(dto.name);
        const googleMapsUrl = `https://www.google.com/maps?q=${dto.latitude},${dto.longitude}`;
        const cafe = this.cafesRepository.create({
            name: dto.name,
            slug,
            description: dto.description,
            address: dto.address,
            latitude: dto.latitude,
            longitude: dto.longitude,
            phone: dto.phone,
            googlePlaceId: dto.googlePlaceId,
            googleMapsUrl,
            wifiAvailable: dto.wifiAvailable || false,
            wifiSpeedMbps: dto.wifiSpeedMbps,
            hasMushola: dto.hasMushola || false,
            openingHours: dto.openingHours,
            priceRange: dto.priceRange || '$$',
        });
        const saved = await this.cafesRepository.save(cafe);
        if (dto.facilities?.length) {
            for (const f of dto.facilities) {
                await this.facilitiesRepository.save({
                    cafeId: saved.id,
                    facilityKey: f.facilityKey,
                    facilityValue: f.facilityValue,
                });
            }
        }
        return this.findOne(saved.id);
    }
    async softRemove(id) {
        const cafe = await this.cafesRepository.findOne({
            where: { id },
            relations: ['menus', 'photos', 'reviews'],
            withDeleted: true,
        });
        if (!cafe)
            throw new common_1.NotFoundException('Cafe not found');
        await this.dataSource.transaction(async (manager) => {
            const now = new Date();
            await manager.query(`UPDATE cafe_menus SET deleted_at = ? WHERE cafe_id = ? AND deleted_at IS NULL`, [now, id]);
            await manager.query(`UPDATE cafe_photos SET deleted_at = ? WHERE cafe_id = ? AND deleted_at IS NULL`, [now, id]);
            await manager.query(`UPDATE reviews SET deleted_at = ? WHERE cafe_id = ? AND deleted_at IS NULL`, [now, id]);
            await manager.softDelete(cafe_entity_1.Cafe, id);
        });
        try {
            await this.meiliCafes.removeCafe(id);
        }
        catch (err) {
            await this.meiliCafes.queueFailure(id, 'remove', String(err));
        }
    }
    async restore(id) {
        const cafe = await this.cafesRepository.findOne({
            where: { id },
            withDeleted: true,
        });
        if (!cafe)
            throw new common_1.NotFoundException('Cafe not found');
        if (!cafe.deletedAt)
            throw new common_1.NotFoundException('Cafe is not deleted');
        const deletedAt = cafe.deletedAt;
        await this.dataSource.transaction(async (manager) => {
            const after = new Date(deletedAt.getTime() - 1000);
            await manager.query(`UPDATE cafe_menus SET deleted_at = NULL WHERE cafe_id = ? AND deleted_at >= ?`, [id, after]);
            await manager.query(`UPDATE cafe_photos SET deleted_at = NULL WHERE cafe_id = ? AND deleted_at >= ?`, [id, after]);
            await manager.query(`UPDATE reviews SET deleted_at = NULL WHERE cafe_id = ? AND deleted_at >= ?`, [id, after]);
            await manager.restore(cafe_entity_1.Cafe, id);
        });
        try {
            await this.meiliCafes.indexCafe(id);
        }
        catch (err) {
            await this.meiliCafes.queueFailure(id, 'index', String(err));
        }
    }
    async loadPurposeMatchers() {
        const purposes = await this.dataSource.query(`SELECT id, name, slug FROM purposes ORDER BY display_order ASC`);
        const reqs = await this.requirementsRepository.find();
        const reqsByPurpose = new Map();
        for (const r of reqs) {
            if (!reqsByPurpose.has(r.purposeId))
                reqsByPurpose.set(r.purposeId, []);
            reqsByPurpose.get(r.purposeId).push({
                facilityKey: r.facilityKey,
                isMandatory: r.isMandatory,
                weight: r.weight,
            });
        }
        return purposes.map((p) => {
            const requirements = reqsByPurpose.get(p.id) || [];
            const maxScore = requirements.reduce((s, r) => s + r.weight, 0);
            return { id: p.id, name: p.name, slug: p.slug, requirements, maxScore };
        });
    }
    computePurposesAndScore(facilityKeys, matchers) {
        const strictMatches = [];
        const looseMatches = [];
        for (const p of matchers) {
            const mandatoryKeys = p.requirements.filter((r) => r.isMandatory).map((r) => r.facilityKey);
            const strictMet = mandatoryKeys.every((k) => facilityKeys.includes(k));
            const matchedWeight = p.requirements
                .filter((r) => facilityKeys.includes(r.facilityKey))
                .reduce((s, r) => s + r.weight, 0);
            const normalizedScore = p.maxScore > 0 ? Math.round((matchedWeight / p.maxScore) * 100) : 0;
            if (strictMet && matchedWeight > 0) {
                strictMatches.push({ name: p.name, score: normalizedScore });
            }
            else if (matchedWeight > 0) {
                looseMatches.push({ name: p.name, score: normalizedScore });
            }
        }
        const chosen = strictMatches.length > 0 ? strictMatches : looseMatches;
        chosen.sort((a, b) => b.score - a.score);
        const purposeNames = chosen.slice(0, 4).map((m) => m.name);
        const bestScore = chosen.length > 0 ? chosen[0].score : 0;
        const matchScore = Math.min(98, Math.max(60, bestScore || 65));
        return { purposes: purposeNames, matchScore };
    }
    generateSlug(name) {
        return (name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim() +
            '-' +
            Date.now().toString(36));
    }
};
exports.CafesService = CafesService;
exports.CafesService = CafesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cafe_entity_1.Cafe)),
    __param(1, (0, typeorm_1.InjectRepository)(cafe_facility_entity_1.CafeFacility)),
    __param(2, (0, typeorm_1.InjectRepository)(cafe_menu_entity_1.CafeMenu)),
    __param(3, (0, typeorm_1.InjectRepository)(cafe_photo_entity_1.CafePhoto)),
    __param(4, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(5, (0, typeorm_1.InjectRepository)(purpose_requirement_entity_1.PurposeRequirement)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        meili_cafes_service_1.MeiliCafesService])
], CafesService);
//# sourceMappingURL=cafes.service.js.map