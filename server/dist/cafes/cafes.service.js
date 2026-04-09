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
        c.opening_hours AS openingHours,
        c.price_range AS priceRange,
        c.bookmarks_count AS bookmarksCount,
        c.favorites_count AS favoritesCount,
        c.has_active_promotion AS hasActivePromotion,
        c.active_promotion_type AS activePromotionType,
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
        }
        return {
            data: results.map((r) => ({
                ...r,
                latitude: parseFloat(r.latitude),
                longitude: parseFloat(r.longitude),
                distanceMeters: Math.round(r.distanceMeters),
                wifiAvailable: !!r.wifiAvailable,
                hasMushola: !!r.hasMushola,
                hasActivePromotion: !!r.hasActivePromotion,
                openingHours: typeof r.openingHours === 'string'
                    ? JSON.parse(r.openingHours)
                    : r.openingHours,
                facilities: facilitiesMap.get(r.id) || [],
                photos: photosMap.get(r.id) || (r.primaryPhotoUrl ? [{ url: r.primaryPhotoUrl, displayOrder: 0, isPrimary: true }] : []),
                promotionContent: r.promoTitle ? {
                    title: r.promoTitle,
                    description: r.promoDescription,
                    photoUrl: r.promoPhotoUrl,
                } : null,
            })),
            meta: { page, limit, total: parseInt(total, 10) },
        };
    }
    async filterByPurpose(nearbyCafes, purposeId) {
        const requirements = await this.requirementsRepository.find({
            where: { purposeId },
        });
        if (requirements.length === 0)
            return nearbyCafes;
        const mandatoryKeys = requirements
            .filter((r) => r.isMandatory)
            .map((r) => r.facilityKey);
        const allKeys = requirements.map((r) => r.facilityKey);
        const cafeIds = nearbyCafes.data.map((c) => c.id);
        if (cafeIds.length === 0) {
            return { data: [], meta: { ...nearbyCafes.meta, total: 0 } };
        }
        const facilities = await this.facilitiesRepository.find({
            where: { cafeId: (0, typeorm_2.In)(cafeIds), facilityKey: (0, typeorm_2.In)(allKeys) },
        });
        const facilityMap = new Map();
        for (const f of facilities) {
            if (!facilityMap.has(f.cafeId))
                facilityMap.set(f.cafeId, []);
            facilityMap.get(f.cafeId).push(f.facilityKey);
        }
        const scored = nearbyCafes.data
            .map((cafe) => {
            const keys = facilityMap.get(cafe.id) || [];
            if (!mandatoryKeys.every((k) => keys.includes(k)))
                return null;
            const matchScore = requirements
                .filter((r) => keys.includes(r.facilityKey))
                .reduce((sum, r) => sum + r.weight, 0);
            return { ...cafe, matchScore };
        })
            .filter(Boolean)
            .sort((a, b) => b.matchScore - a.matchScore || a.distanceMeters - b.distanceMeters);
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
        return cafe;
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
            .where('c.isActive = :active', { active: true })
            .andWhere('c.hasActivePromotion = :promoted', { promoted: true });
        if (type) {
            qb.andWhere('c.activePromotionType = :type', { type });
        }
        const cafes = await qb.getMany();
        if (!type || type === 'featured_promo') {
            const cafeIds = cafes.filter(c => c.activePromotionType === 'featured_promo').map(c => c.id);
            if (cafeIds.length > 0) {
                const promotions = await this.dataSource.query(`SELECT p.cafe_id, p.content_title, p.content_description, p.content_photo_url,
                  p.highlighted_facilities, pkg.name AS package_name, pkg.display_order
           FROM promotions p
           JOIN advertisement_packages pkg ON p.package_id = pkg.id
           WHERE p.cafe_id IN (${cafeIds.map(() => '?').join(',')})
             AND p.status = 'active' AND p.expires_at > NOW()
           ORDER BY pkg.display_order DESC`, cafeIds);
                const promoMap = new Map();
                for (const p of promotions) {
                    if (!promoMap.has(p.cafe_id))
                        promoMap.set(p.cafe_id, p);
                }
                return cafes.map((cafe) => ({
                    ...cafe,
                    promotion: promoMap.get(cafe.id) || null,
                }));
            }
        }
        return cafes;
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