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

interface PurposeMatcher {
  id: number;
  name: string;
  slug: string;
  requirements: { facilityKey: string; isMandatory: boolean; weight: number }[];
  maxScore: number;
}

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

  /**
   * Load all purposes with their facility requirements.
   * Used to compute each cafe's matching purposes + overall match score.
   */
  private async loadPurposeMatchers(): Promise<PurposeMatcher[]> {
    const purposes = await this.dataSource.query(`
      SELECT id, name, slug
      FROM purposes
      ORDER BY display_order ASC
    `);
    const reqs = await this.requirementsRepository.find();
    const reqsByPurpose = new Map<
      number,
      { facilityKey: string; isMandatory: boolean; weight: number }[]
    >();
    for (const r of reqs) {
      if (!reqsByPurpose.has(r.purposeId)) reqsByPurpose.set(r.purposeId, []);
      reqsByPurpose.get(r.purposeId)!.push({
        facilityKey: r.facilityKey,
        isMandatory: r.isMandatory,
        weight: r.weight,
      });
    }
    return purposes.map((p: any) => {
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

  /**
   * Given the facility keys a cafe has, compute:
   *  - `purposes`: friendly purpose names that loosely match (any overlap)
   *  - `matchScore`: 0-100 score based on best purpose's requirement coverage
   */
  private computePurposesAndScore(
    facilityKeys: string[],
    matchers: PurposeMatcher[],
  ): { purposes: string[]; matchScore: number } {
    const strictMatches: { name: string; score: number }[] = [];
    const looseMatches: { name: string; score: number }[] = [];

    for (const p of matchers) {
      const mandatoryKeys = p.requirements
        .filter((r) => r.isMandatory)
        .map((r) => r.facilityKey);
      const strictMet = mandatoryKeys.every((k) => facilityKeys.includes(k));
      const matchedWeight = p.requirements
        .filter((r) => facilityKeys.includes(r.facilityKey))
        .reduce((s, r) => s + r.weight, 0);
      const normalizedScore =
        p.maxScore > 0 ? Math.round((matchedWeight / p.maxScore) * 100) : 0;

      if (strictMet && matchedWeight > 0) {
        strictMatches.push({ name: p.name, score: normalizedScore });
      } else if (matchedWeight > 0) {
        looseMatches.push({ name: p.name, score: normalizedScore });
      }
    }

    // Prefer strict matches; fall back to loose matches if none strict
    const chosen = strictMatches.length > 0 ? strictMatches : looseMatches;
    chosen.sort((a, b) => b.score - a.score);

    const purposeNames = chosen.slice(0, 4).map((m) => m.name);
    const bestScore = chosen.length > 0 ? chosen[0].score : 0;

    // Boost low scores a bit so every cafe shows a reasonable match number
    const matchScore = Math.min(98, Math.max(60, bestScore || 65));

    return { purposes: purposeNames, matchScore };
  }

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

    // Include primary photo via LEFT JOIN, plus promotion content via LEFT JOIN
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

    // Batch-load facilities, photos, and purpose tags for all returned cafes
    const cafeIds: number[] = results.map((r: any) => r.id);
    let facilitiesMap = new Map<number, { facilityKey: string; facilityValue: string | null }[]>();
    let photosMap = new Map<number, { url: string; displayOrder: number; isPrimary: boolean }[]>();
    let purposeTagsMap = new Map<number, { purposeSlug: string; score: number }[]>();

    if (cafeIds.length > 0) {
      const placeholders = cafeIds.map(() => '?').join(',');
      const rawFacilities = await this.dataSource.query(
        `SELECT cafe_id AS cafeId, facility_key AS facilityKey, facility_value AS facilityValue
         FROM cafe_facilities WHERE cafe_id IN (${placeholders})`,
        cafeIds,
      );
      for (const f of rawFacilities) {
        if (!facilitiesMap.has(f.cafeId)) facilitiesMap.set(f.cafeId, []);
        facilitiesMap.get(f.cafeId)!.push({ facilityKey: f.facilityKey, facilityValue: f.facilityValue });
      }

      const rawPhotos = await this.dataSource.query(
        `SELECT cafe_id AS cafeId, url, display_order AS displayOrder, is_primary AS isPrimary
         FROM cafe_photos WHERE cafe_id IN (${placeholders}) ORDER BY display_order ASC`,
        cafeIds,
      );
      for (const p of rawPhotos) {
        if (!photosMap.has(p.cafeId)) photosMap.set(p.cafeId, []);
        photosMap.get(p.cafeId)!.push({ url: p.url, displayOrder: p.displayOrder, isPrimary: !!p.isPrimary });
      }

      // cafe_purpose_tags — optional (table only exists after scraping migration)
      try {
        const rawTags = await this.dataSource.query(
          `SELECT cafe_id AS cafeId, purpose_slug AS purposeSlug, score
           FROM cafe_purpose_tags WHERE cafe_id IN (${placeholders})`,
          cafeIds,
        );
        for (const t of rawTags) {
          if (!purposeTagsMap.has(t.cafeId)) purposeTagsMap.set(t.cafeId, []);
          purposeTagsMap.get(t.cafeId)!.push({ purposeSlug: t.purposeSlug, score: t.score });
        }
      } catch {
        // Table doesn't exist yet — safe to ignore
      }
    }

    const parseJson = (v: any) => {
      if (v == null) return null;
      if (typeof v === 'string') {
        try {
          return JSON.parse(v);
        } catch {
          return null;
        }
      }
      return v;
    };

    // Load purpose matchers once for the batch
    const purposeMatchers = await this.loadPurposeMatchers();

    return {
      data: results.map((r: any) => {
        const storedPromotionContent = parseJson(r.promotionContentJson);
        const storedNewCafeContent = parseJson(r.newCafeContentJson);
        // Promotions table live content takes precedence; fall back to cafe row JSON
        const inlinePromotion = r.promoTitle
          ? {
              title: r.promoTitle,
              description: r.promoDescription,
              promoPhoto: r.promoPhotoUrl,
            }
          : null;
        const promotionContent = inlinePromotion || storedPromotionContent;

        // Strip the raw columns from the spread
        const { promotionContentJson, newCafeContentJson, promoTitle, promoDescription, promoPhotoUrl, ...rest } = r;

        const cafeFacilities = facilitiesMap.get(r.id) || [];
        const facilityKeys = cafeFacilities.map((f) => f.facilityKey);
        const { purposes, matchScore } = this.computePurposesAndScore(
          facilityKeys,
          purposeMatchers,
        );

        // Build purposeScores object from scraped cafe_purpose_tags
        const tagList = purposeTagsMap.get(r.id) || [];
        const purposeScores: Record<string, number> = {};
        for (const t of tagList) purposeScores[t.purposeSlug] = t.score;

        // Construct google_maps_url if missing
        const googleMapsUrl =
          r.googleMapsUrl ||
          `https://maps.google.com/?q=${r.latitude},${r.longitude}`;

        return {
          ...rest,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
          distanceMeters: Math.round(r.distanceMeters),
          distance: Math.round(r.distanceMeters / 100) / 10, // km
          wifiAvailable: !!r.wifiAvailable,
          hasMushola: !!r.hasMushola,
          hasParking: !!r.hasParking,
          hasActivePromotion: !!r.hasActivePromotion,
          googleRating: r.googleRating != null ? parseFloat(r.googleRating) : null,
          totalGoogleReviews: r.totalGoogleReviews ?? null,
          website: r.website ?? null,
          googleMapsUrl,
          openingHours:
            typeof r.openingHours === 'string'
              ? JSON.parse(r.openingHours)
              : r.openingHours,
          facilities: cafeFacilities,
          detectedFacilities: facilityKeys,
          photos:
            photosMap.get(r.id) ||
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

  private async filterByPurpose(
    nearbyCafes: { data: any[]; meta: any },
    purposeId: number,
  ) {
    const cafeIds = nearbyCafes.data.map((c) => c.id);
    if (cafeIds.length === 0) {
      return { data: [], meta: { ...nearbyCafes.meta, total: 0 } };
    }

    // Primary: use cafe_purpose_tags (scraped review analysis)
    // Map purposeId → purpose_slug
    const [purposeRow] = await this.dataSource.query(
      `SELECT slug FROM purposes WHERE id = ?`,
      [purposeId],
    );
    const purposeSlug = purposeRow?.slug;

    const scoreByCafeId = new Map<number, number>();
    if (purposeSlug) {
      try {
        const placeholders = cafeIds.map(() => '?').join(',');
        const tagRows: any[] = await this.dataSource.query(
          `SELECT cafe_id AS cafeId, score
           FROM cafe_purpose_tags
           WHERE purpose_slug = ? AND cafe_id IN (${placeholders})`,
          [purposeSlug, ...cafeIds],
        );
        for (const t of tagRows) {
          scoreByCafeId.set(Number(t.cafeId), parseInt(t.score, 10));
        }
      } catch {
        // cafe_purpose_tags missing — fall through
      }
    }

    // Keep cafes with score >= 40 from scraped tags
    let scored = nearbyCafes.data
      .map((cafe) => {
        const score = scoreByCafeId.get(Number(cafe.id));
        if (score != null && score >= 40) {
          return { ...cafe, matchScore: score };
        }
        return null;
      })
      .filter(Boolean) as any[];

    // Fallback: if nothing matched via purpose tags, fall back to facility-based matching
    if (scored.length === 0) {
      const requirements = await this.requirementsRepository.find({ where: { purposeId } });
      if (requirements.length > 0) {
        const mandatoryKeys = requirements
          .filter((r) => r.isMandatory)
          .map((r) => r.facilityKey);
        const allKeys = requirements.map((r) => r.facilityKey);

        const facilities = await this.facilitiesRepository.find({
          where: { cafeId: In(cafeIds), facilityKey: In(allKeys) },
        });
        const facilityMap = new Map<number, string[]>();
        for (const f of facilities) {
          if (!facilityMap.has(f.cafeId)) facilityMap.set(f.cafeId, []);
          facilityMap.get(f.cafeId)!.push(f.facilityKey);
        }

        scored = nearbyCafes.data
          .map((cafe) => {
            const keys = facilityMap.get(cafe.id) || [];
            if (!mandatoryKeys.every((k) => keys.includes(k))) return null;
            const matchScore = requirements
              .filter((r) => keys.includes(r.facilityKey))
              .reduce((sum, r) => sum + r.weight, 0);
            return { ...cafe, matchScore };
          })
          .filter(Boolean);
      }
    }

    scored.sort(
      (a: any, b: any) => b.matchScore - a.matchScore || a.distanceMeters - b.distanceMeters,
    );

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

    // Compute purposes + match score from facilities
    const facilityKeys = (cafe.facilities || []).map((f) => f.facilityKey);
    const purposeMatchers = await this.loadPurposeMatchers();
    const { purposes, matchScore } = this.computePurposesAndScore(
      facilityKeys,
      purposeMatchers,
    );

    // Load purpose tags (scraped scores)
    const purposeScores: Record<string, number> = {};
    try {
      const tags = await this.dataSource.query(
        `SELECT purpose_slug AS purposeSlug, score FROM cafe_purpose_tags WHERE cafe_id = ?`,
        [id],
      );
      for (const t of tags) purposeScores[t.purposeSlug] = t.score;
    } catch {
      // table not created yet
    }

    // Reviews summary (avg per category)
    let reviewsSummary: any[] = [];
    try {
      reviewsSummary = await this.dataSource.query(
        `SELECT rr.category, ROUND(AVG(rr.score), 1) AS avgScore, COUNT(*) AS count
         FROM review_ratings rr JOIN reviews r ON r.id = rr.review_id
         WHERE r.cafe_id = ? GROUP BY rr.category`,
        [id],
      );
    } catch {
      // reviews tables not created yet
    }

    const googleMapsUrl =
      cafe.googleMapsUrl ||
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
      .leftJoinAndSelect('c.facilities', 'facilities')
      .leftJoinAndSelect('c.photos', 'photos')
      .where('c.isActive = :active', { active: true })
      .andWhere('c.hasActivePromotion = :promoted', { promoted: true });

    if (type) {
      qb.andWhere('c.activePromotionType = :type', { type });
    }

    const cafes = await qb.getMany();

    // Load promotions for featured_promo
    const promoMap = new Map<number, any>();
    if (!type || type === 'featured_promo') {
      const cafeIds = cafes
        .filter((c) => c.activePromotionType === 'featured_promo')
        .map((c) => c.id);
      if (cafeIds.length > 0) {
        const promotions = await this.dataSource.query(
          `SELECT p.cafe_id, p.content_title AS contentTitle, p.content_description AS contentDescription,
                  p.content_photo_url AS contentPhotoUrl,
                  pkg.name AS package_name, pkg.display_order
           FROM promotions p
           JOIN advertisement_packages pkg ON p.package_id = pkg.id
           WHERE p.cafe_id IN (${cafeIds.map(() => '?').join(',')})
             AND p.status = 'active' AND p.expires_at > NOW()
           ORDER BY pkg.display_order DESC`,
          cafeIds,
        );

        for (const p of promotions) {
          if (!promoMap.has(p.cafe_id)) promoMap.set(p.cafe_id, p);
        }
      }
    }

    const purposeMatchers = await this.loadPurposeMatchers();

    return cafes.map((cafe) => {
      const facilityKeys = (cafe.facilities || []).map((f) => f.facilityKey);
      const { purposes, matchScore } = this.computePurposesAndScore(
        facilityKeys,
        purposeMatchers,
      );
      return {
        ...cafe,
        purposes,
        matchScore,
        promotion: promoMap.get(cafe.id) || null,
      };
    });
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
