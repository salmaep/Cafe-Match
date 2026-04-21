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
const purpose_requirement_entity_1 = require("../purposes/entities/purpose-requirement.entity");
const HAVERSINE_SQL = `
  (6371000 * ACOS(
    LEAST(1, COS(RADIANS(?)) * COS(RADIANS(c.latitude))
    * COS(RADIANS(c.longitude) - RADIANS(?))
    + SIN(RADIANS(?)) * SIN(RADIANS(c.latitude)))
  ))
`;
let CafesService = class CafesService {
    cafesRepository;
    facilitiesRepository;
    requirementsRepository;
    dataSource;
    constructor(cafesRepository, facilitiesRepository, requirementsRepository, dataSource) {
        this.cafesRepository = cafesRepository;
        this.facilitiesRepository = facilitiesRepository;
        this.requirementsRepository = requirementsRepository;
        this.dataSource = dataSource;
    }
    async loadPurposeMatchers() {
        const purposes = await this.dataSource.query(`
      SELECT id, name, slug
      FROM purposes
      ORDER BY display_order ASC
    `);
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
            return {
                id: p.id,
                name: p.name,
                slug: p.slug,
                requirements,
                maxScore,
            };
        });
    }
    computePurposesAndScore(facilityKeys, matchers) {
        const strictMatches = [];
        const looseMatches = [];
        for (const p of matchers) {
            const mandatoryKeys = p.requirements
                .filter((r) => r.isMandatory)
                .map((r) => r.facilityKey);
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
        let matchScore;
        if (chosen.length === 0) {
            matchScore = Math.min(40, 20 + facilityKeys.length * 3);
        }
        else {
            const isStrict = strictMatches.length > 0;
            const bonus = isStrict ? 10 : 0;
            matchScore = Math.min(99, Math.max(20, bestScore + bonus));
        }
        return { purposes: purposeNames, matchScore };
    }
    async search(dto) {
        const hasGeo = dto.lat != null && dto.lng != null;
        if (!hasGeo) {
            return this.searchByText(dto);
        }
        const nearbyCafes = await this.findCafesInRadius(dto);
        if (!dto.purposeId) {
            return nearbyCafes;
        }
        return this.filterByPurpose(nearbyCafes, dto.purposeId);
    }
    async searchByText(dto) {
        const { q, wifiAvailable, hasMushola, priceRange, page = 1, limit = 20 } = dto;
        const qb = this.cafesRepository
            .createQueryBuilder('c')
            .where('c.isActive = :active', { active: true });
        if (q) {
            qb.andWhere('(c.name LIKE :q OR c.address LIKE :q OR c.description LIKE :q)', { q: `%${q}%` });
        }
        if (wifiAvailable === 'true') {
            qb.andWhere('c.wifiAvailable = :wifi', { wifi: true });
        }
        if (hasMushola === 'true') {
            qb.andWhere('c.hasMushola = :mushola', { mushola: true });
        }
        if (priceRange) {
            qb.andWhere('c.priceRange = :price', { price: priceRange });
        }
        const total = await qb.getCount();
        const data = await qb
            .orderBy('c.name', 'ASC')
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();
        return { data, meta: { page, limit, total } };
    }
    async findCafesInRadius(dto) {
        const { lat, lng, radius = 2000, q, wifiAvailable, hasMushola, priceRange, page = 1, limit = 20, } = dto;
        const latDelta = radius / 111320;
        const lngDelta = radius / (111320 * Math.cos((lat * Math.PI) / 180));
        const minLat = lat - latDelta;
        const maxLat = lat + latDelta;
        const minLng = lng - lngDelta;
        const maxLng = lng + lngDelta;
        const offset = (page - 1) * limit;
        const conditions = [
            'c.is_active = TRUE',
            'c.latitude BETWEEN ? AND ?',
            'c.longitude BETWEEN ? AND ?',
            `${HAVERSINE_SQL} <= ?`,
        ];
        const params = [
            minLat, maxLat,
            minLng, maxLng,
            lat, lng, lat,
            radius,
        ];
        if (q) {
            conditions.push('(c.name LIKE ? OR c.address LIKE ? OR c.description LIKE ?)');
            const like = `%${q}%`;
            params.push(like, like, like);
        }
        if (wifiAvailable === 'true') {
            conditions.push('c.wifi_available = TRUE');
        }
        if (hasMushola === 'true') {
            conditions.push('c.has_mushola = TRUE');
        }
        if (priceRange) {
            conditions.push('c.price_range = ?');
            params.push(priceRange);
        }
        const whereClause = conditions.join(' AND ');
        const selectHaversineParams = [lat, lng, lat];
        const query = `
      SELECT
        c.id, c.name, c.slug, c.description, c.address,
        c.latitude, c.longitude, c.phone,
        c.google_place_id AS googlePlaceId,
        c.google_maps_url AS googleMapsUrl,
        c.wifi_available AS wifiAvailable,
        c.wifi_speed_mbps AS wifiSpeedMbps,
        c.has_mushola AS hasMushola,
        c.has_parking AS hasParking,
        c.google_rating AS googleRating,
        c.total_google_reviews AS totalGoogleReviews,
        c.website,
        c.opening_hours AS openingHours,
        c.price_range AS priceRange,
        c.bookmarks_count AS bookmarksCount,
        c.favorites_count AS favoritesCount,
        c.has_active_promotion AS hasActivePromotion,
        c.active_promotion_type AS activePromotionType,
        c.promotion_content AS promotionContentJson,
        c.new_cafe_content AS newCafeContentJson,
        ph.url AS primaryPhotoUrl,
        promo.content_title AS promoTitle,
        promo.content_description AS promoDescription,
        promo.content_photo_url AS promoPhotoUrl,
        ${HAVERSINE_SQL} AS distanceMeters
      FROM cafes c
      LEFT JOIN cafe_photos ph ON ph.cafe_id = c.id AND ph.is_primary = TRUE
      LEFT JOIN promotions promo ON promo.cafe_id = c.id
        AND promo.status = 'active'
        AND promo.expires_at > NOW()
        AND c.has_active_promotion = TRUE
      WHERE ${whereClause}
      GROUP BY c.id, ph.url, promo.content_title, promo.content_description, promo.content_photo_url
      ORDER BY distanceMeters ASC
      LIMIT ? OFFSET ?
    `;
        const results = await this.dataSource.query(query, [
            ...selectHaversineParams,
            ...params,
            limit,
            offset,
        ]);
        const countQuery = `SELECT COUNT(*) AS total FROM cafes c WHERE ${whereClause}`;
        const [{ total }] = await this.dataSource.query(countQuery, params);
        const cafeIds = results.map((r) => r.id);
        let facilitiesMap = new Map();
        let photosMap = new Map();
        let purposeTagsMap = new Map();
        if (cafeIds.length > 0) {
            const placeholders = cafeIds.map(() => '?').join(',');
            const rawFacilities = await this.dataSource.query(`SELECT cafe_id AS cafeId, facility_key AS facilityKey, facility_value AS facilityValue
         FROM cafe_facilities WHERE cafe_id IN (${placeholders})`, cafeIds);
            for (const f of rawFacilities) {
                if (!facilitiesMap.has(f.cafeId))
                    facilitiesMap.set(f.cafeId, []);
                facilitiesMap.get(f.cafeId).push({ facilityKey: f.facilityKey, facilityValue: f.facilityValue });
            }
            const rawPhotos = await this.dataSource.query(`SELECT cafe_id AS cafeId, url, display_order AS displayOrder, is_primary AS isPrimary
         FROM cafe_photos WHERE cafe_id IN (${placeholders}) ORDER BY display_order ASC`, cafeIds);
            for (const p of rawPhotos) {
                if (!photosMap.has(p.cafeId))
                    photosMap.set(p.cafeId, []);
                photosMap.get(p.cafeId).push({ url: p.url, displayOrder: p.displayOrder, isPrimary: !!p.isPrimary });
            }
            try {
                const rawTags = await this.dataSource.query(`SELECT cafe_id AS cafeId, purpose_slug AS purposeSlug, score
           FROM cafe_purpose_tags WHERE cafe_id IN (${placeholders})`, cafeIds);
                for (const t of rawTags) {
                    if (!purposeTagsMap.has(t.cafeId))
                        purposeTagsMap.set(t.cafeId, []);
                    purposeTagsMap.get(t.cafeId).push({ purposeSlug: t.purposeSlug, score: t.score });
                }
            }
            catch {
            }
        }
        const parseJson = (v) => {
            if (v == null)
                return null;
            if (typeof v === 'string') {
                try {
                    return JSON.parse(v);
                }
                catch {
                    return null;
                }
            }
            return v;
        };
        const purposeMatchers = await this.loadPurposeMatchers();
        return {
            data: results.map((r) => {
                const storedPromotionContent = parseJson(r.promotionContentJson);
                const storedNewCafeContent = parseJson(r.newCafeContentJson);
                const inlinePromotion = r.promoTitle
                    ? {
                        title: r.promoTitle,
                        description: r.promoDescription,
                        promoPhoto: r.promoPhotoUrl,
                    }
                    : null;
                const promotionContent = inlinePromotion || storedPromotionContent;
                const { promotionContentJson, newCafeContentJson, promoTitle, promoDescription, promoPhotoUrl, ...rest } = r;
                const cafeFacilities = facilitiesMap.get(r.id) || [];
                const facilityKeys = cafeFacilities.map((f) => f.facilityKey);
                const { purposes, matchScore } = this.computePurposesAndScore(facilityKeys, purposeMatchers);
                const tagList = purposeTagsMap.get(r.id) || [];
                const purposeScores = {};
                for (const t of tagList)
                    purposeScores[t.purposeSlug] = t.score;
                const googleMapsUrl = r.googleMapsUrl ||
                    `https://maps.google.com/?q=${r.latitude},${r.longitude}`;
                return {
                    ...rest,
                    latitude: parseFloat(r.latitude),
                    longitude: parseFloat(r.longitude),
                    distanceMeters: Math.round(r.distanceMeters),
                    distance: Math.round(r.distanceMeters / 100) / 10,
                    wifiAvailable: !!r.wifiAvailable,
                    hasMushola: !!r.hasMushola,
                    hasParking: !!r.hasParking,
                    hasActivePromotion: !!r.hasActivePromotion,
                    googleRating: r.googleRating != null ? parseFloat(r.googleRating) : null,
                    totalGoogleReviews: r.totalGoogleReviews ?? null,
                    website: r.website ?? null,
                    googleMapsUrl,
                    openingHours: typeof r.openingHours === 'string'
                        ? JSON.parse(r.openingHours)
                        : r.openingHours,
                    facilities: cafeFacilities,
                    detectedFacilities: facilityKeys,
                    photos: photosMap.get(r.id) ||
                        (r.primaryPhotoUrl
                            ? [{ url: r.primaryPhotoUrl, displayOrder: 0, isPrimary: true }]
                            : []),
                    promotionContent,
                    newCafeContent: storedNewCafeContent,
                    purposes,
                    purposeScores,
                    matchScore: r.matchScore ?? matchScore,
                };
            }),
            meta: { page, limit, total: parseInt(total, 10) },
        };
    }
    async filterByPurpose(nearbyCafes, purposeId) {
        const cafeIds = nearbyCafes.data.map((c) => c.id);
        if (cafeIds.length === 0) {
            return { data: [], meta: { ...nearbyCafes.meta, total: 0 } };
        }
        const [purposeRow] = await this.dataSource.query(`SELECT slug FROM purposes WHERE id = ?`, [purposeId]);
        const purposeSlug = purposeRow?.slug;
        const scoreByCafeId = new Map();
        if (purposeSlug) {
            try {
                const placeholders = cafeIds.map(() => '?').join(',');
                const tagRows = await this.dataSource.query(`SELECT cafe_id AS cafeId, score
           FROM cafe_purpose_tags
           WHERE purpose_slug = ? AND cafe_id IN (${placeholders})`, [purposeSlug, ...cafeIds]);
                for (const t of tagRows) {
                    scoreByCafeId.set(Number(t.cafeId), parseInt(t.score, 10));
                }
            }
            catch {
            }
        }
        let scored = nearbyCafes.data
            .map((cafe) => {
            const score = scoreByCafeId.get(Number(cafe.id));
            if (score != null && score >= 40) {
                return { ...cafe, matchScore: score };
            }
            return null;
        })
            .filter(Boolean);
        if (scored.length === 0) {
            const requirements = await this.requirementsRepository.find({ where: { purposeId } });
            if (requirements.length > 0) {
                const mandatoryKeys = requirements
                    .filter((r) => r.isMandatory)
                    .map((r) => r.facilityKey);
                const allKeys = requirements.map((r) => r.facilityKey);
                const facilities = await this.facilitiesRepository.find({
                    where: { cafeId: (0, typeorm_2.In)(cafeIds), facilityKey: (0, typeorm_2.In)(allKeys) },
                });
                const facilityMap = new Map();
                for (const f of facilities) {
                    if (!facilityMap.has(f.cafeId))
                        facilityMap.set(f.cafeId, []);
                    facilityMap.get(f.cafeId).push(f.facilityKey);
                }
                scored = nearbyCafes.data
                    .map((cafe) => {
                    const keys = facilityMap.get(cafe.id) || [];
                    if (!mandatoryKeys.every((k) => keys.includes(k)))
                        return null;
                    const matchScore = requirements
                        .filter((r) => keys.includes(r.facilityKey))
                        .reduce((sum, r) => sum + r.weight, 0);
                    return { ...cafe, matchScore };
                })
                    .filter(Boolean);
            }
        }
        scored.sort((a, b) => b.matchScore - a.matchScore || a.distanceMeters - b.distanceMeters);
        return {
            data: scored,
            meta: { ...nearbyCafes.meta, total: scored.length },
        };
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
         WHERE r.cafe_id = ? GROUP BY rr.category`, [id]);
        }
        catch {
        }
        const googleMapsUrl = cafe.googleMapsUrl ||
            `https://maps.google.com/?q=${cafe.latitude},${cafe.longitude}`;
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
            return {
                ...cafe,
                purposes,
                matchScore,
                promotion: promoMap.get(cafe.id) || null,
            };
        });
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
    __param(2, (0, typeorm_1.InjectRepository)(purpose_requirement_entity_1.PurposeRequirement)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], CafesService);
//# sourceMappingURL=cafes.service.js.map