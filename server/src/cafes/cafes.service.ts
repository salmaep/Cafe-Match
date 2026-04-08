import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Cafe } from './entities/cafe.entity';
import { CafeFacility } from './entities/cafe-facility.entity';
import { PurposeRequirement } from '../purposes/entities/purpose-requirement.entity';
import { SearchCafesDto } from './dto/search-cafes.dto';
import { CreateCafeDto } from './dto/create-cafe.dto';

// Haversine distance formula in SQL (returns meters)
const HAVERSINE_SQL = `
  (6371000 * ACOS(
    LEAST(1, COS(RADIANS(?)) * COS(RADIANS(c.latitude))
    * COS(RADIANS(c.longitude) - RADIANS(?))
    + SIN(RADIANS(?)) * SIN(RADIANS(c.latitude)))
  ))
`;

@Injectable()
export class CafesService {
  constructor(
    @InjectRepository(Cafe)
    private readonly cafesRepository: Repository<Cafe>,
    @InjectRepository(CafeFacility)
    private readonly facilitiesRepository: Repository<CafeFacility>,
    @InjectRepository(PurposeRequirement)
    private readonly requirementsRepository: Repository<PurposeRequirement>,
    private readonly dataSource: DataSource,
  ) {}

  async search(dto: SearchCafesDto) {
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

  private async searchByText(dto: SearchCafesDto) {
    const { q, wifiAvailable, hasMushola, priceRange, page = 1, limit = 20 } = dto;

    const qb = this.cafesRepository
      .createQueryBuilder('c')
      .where('c.isActive = :active', { active: true });

    if (q) {
      qb.andWhere(
        '(c.name LIKE :q OR c.address LIKE :q OR c.description LIKE :q)',
        { q: `%${q}%` },
      );
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

  private async findCafesInRadius(dto: SearchCafesDto) {
    const {
      lat,
      lng,
      radius = 2000,
      q,
      wifiAvailable,
      hasMushola,
      priceRange,
      page = 1,
      limit = 20,
    } = dto;

    // Bounding box pre-filter (fast index scan on lat/lng columns)
    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos((lat! * Math.PI) / 180));
    const minLat = lat! - latDelta;
    const maxLat = lat! + latDelta;
    const minLng = lng! - lngDelta;
    const maxLng = lng! + lngDelta;
    const offset = (page - 1) * limit;

    // Build dynamic WHERE
    const conditions: string[] = [
      'c.is_active = TRUE',
      'c.latitude BETWEEN ? AND ?',
      'c.longitude BETWEEN ? AND ?',
      `${HAVERSINE_SQL} <= ?`,
    ];
    // Params: bounding box, then haversine (lat, lng, lat), then radius
    const params: any[] = [
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

    // Haversine params for SELECT (lat, lng, lat)
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
        ${HAVERSINE_SQL} AS distanceMeters
      FROM cafes c
      WHERE ${whereClause}
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

    return {
      data: results.map((r: any) => ({
        ...r,
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        distanceMeters: Math.round(r.distanceMeters),
        wifiAvailable: !!r.wifiAvailable,
        hasMushola: !!r.hasMushola,
        openingHours:
          typeof r.openingHours === 'string'
            ? JSON.parse(r.openingHours)
            : r.openingHours,
      })),
      meta: { page, limit, total: parseInt(total, 10) },
    };
  }

  private async filterByPurpose(
    nearbyCafes: { data: any[]; meta: any },
    purposeId: number,
  ) {
    const requirements = await this.requirementsRepository.find({
      where: { purposeId },
    });
    if (requirements.length === 0) return nearbyCafes;

    const mandatoryKeys = requirements
      .filter((r) => r.isMandatory)
      .map((r) => r.facilityKey);
    const allKeys = requirements.map((r) => r.facilityKey);
    const cafeIds = nearbyCafes.data.map((c) => c.id);

    if (cafeIds.length === 0) {
      return { data: [], meta: { ...nearbyCafes.meta, total: 0 } };
    }

    const facilities = await this.facilitiesRepository.find({
      where: { cafeId: In(cafeIds), facilityKey: In(allKeys) },
    });

    const facilityMap = new Map<number, string[]>();
    for (const f of facilities) {
      if (!facilityMap.has(f.cafeId)) facilityMap.set(f.cafeId, []);
      facilityMap.get(f.cafeId)!.push(f.facilityKey);
    }

    const scored = nearbyCafes.data
      .map((cafe) => {
        const keys = facilityMap.get(cafe.id) || [];
        if (!mandatoryKeys.every((k) => keys.includes(k))) return null;
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

  async findOne(id: number) {
    const cafe = await this.cafesRepository.findOne({
      where: { id, isActive: true },
      relations: ['facilities', 'menus', 'photos'],
    });
    if (!cafe) throw new NotFoundException('Cafe not found');
    return cafe;
  }

  async create(dto: CreateCafeDto) {
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
    } as Partial<Cafe>);

    const saved = await this.cafesRepository.save(cafe);

    if (dto.facilities?.length) {
      for (const f of dto.facilities) {
        await this.facilitiesRepository.save({
          cafeId: saved.id,
          facilityKey: f.facilityKey,
          facilityValue: f.facilityValue,
        } as Partial<CafeFacility>);
      }
    }

    return this.findOne(saved.id);
  }

  async findPromotedCafes(type?: string) {
    const qb = this.cafesRepository
      .createQueryBuilder('c')
      .where('c.isActive = :active', { active: true })
      .andWhere('c.hasActivePromotion = :promoted', { promoted: true });

    if (type) {
      qb.andWhere('c.activePromotionType = :type', { type });
    }

    const cafes = await qb.getMany();

    // For featured_promo type, also load the promotion content
    if (!type || type === 'featured_promo') {
      const cafeIds = cafes.filter(c => c.activePromotionType === 'featured_promo').map(c => c.id);
      if (cafeIds.length > 0) {
        const promotions = await this.dataSource.query(
          `SELECT p.cafe_id, p.content_title, p.content_description, p.content_photo_url,
                  p.highlighted_facilities, pkg.name AS package_name, pkg.display_order
           FROM promotions p
           JOIN advertisement_packages pkg ON p.package_id = pkg.id
           WHERE p.cafe_id IN (${cafeIds.map(() => '?').join(',')})
             AND p.status = 'active' AND p.expires_at > NOW()
           ORDER BY pkg.display_order DESC`,
          cafeIds,
        );

        const promoMap = new Map<number, any>();
        for (const p of promotions) {
          if (!promoMap.has(p.cafe_id)) promoMap.set(p.cafe_id, p);
        }

        return cafes.map((cafe) => ({
          ...cafe,
          promotion: promoMap.get(cafe.id) || null,
        }));
      }
    }

    return cafes;
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() +
      '-' +
      Date.now().toString(36)
    );
  }
}
