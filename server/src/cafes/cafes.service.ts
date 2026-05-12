import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cafe } from './entities/cafe.entity';
import { CafeFeature } from './entities/cafe-feature.entity';
import { PurposeRequirement } from '../purposes/entities/purpose-requirement.entity';
import { SearchCafesDto } from './dto/search-cafes.dto';
import { DiscoverCafesDto } from './dto/discover-cafes.dto';
import { CreateCafeDto } from './dto/create-cafe.dto';
import { MeiliCafesService } from '../meili/meili-cafes.service';
import { buildCafeSlug, cafeSlugOrFallback } from '../common/utils/slug.util';

interface PurposeMatcher {
  id: number;
  name: string;
  slug: string;
  requirements: { featureName: string; isMandatory: boolean; weight: number }[];
  maxScore: number;
}

@Injectable()
export class CafesService {
  constructor(
    @InjectRepository(Cafe)
    private readonly cafesRepository: Repository<Cafe>,
    @InjectRepository(CafeFeature)
    private readonly featuresRepository: Repository<CafeFeature>,
    @InjectRepository(PurposeRequirement)
    private readonly requirementsRepository: Repository<PurposeRequirement>,
    private readonly dataSource: DataSource,
    private readonly meiliCafes: MeiliCafesService,
  ) {}

  // ── Search (Meilisearch) ────────────────────────────────────────────────────

  async search(dto: SearchCafesDto) {
    return this.meiliCafes.searchCafes({
      q: dto.q,
      lat: dto.lat,
      lng: dto.lng,
      radius: dto.radius,
      facilities: dto.facilities,
      priceRange: dto.priceRange,
      purposeId: dto.purposeId,
      page: dto.page,
      limit: dto.limit,
      sort: dto.sort,
    });
  }

  // ── Filter catalog (cafe_features grouped by category) ─────────────────────

  /** Hard cap on items returned per category. Matches the frontend FilterPanel
   *  `INITIAL_VISIBLE` so categories like `service` (~70 features) don't flood
   *  the API response with options the user can never see anyway. Categories
   *  are pre-sorted by count DESC, so this keeps the top picks. */
  private static readonly FILTER_ITEMS_PER_CATEGORY = 10;

  async getFilters(isOptions = false) {
    const rows = await this.dataSource.query<
      { name: string; category: string | null; total: string }[]
    >(
      `SELECT f.name, f.category, COUNT(*) AS total
       FROM cafe_features cf
       JOIN features f ON f.id = cf.feature_id
       JOIN cafes c ON c.id = cf.cafe_id
       WHERE c.deleted_at IS NULL AND c.is_active = TRUE
         AND f.category IS NOT NULL AND f.category != ''
       GROUP BY f.id
       ORDER BY f.category ASC, total DESC, f.name ASC`,
    );

    const flat = rows.map((r) => ({
      name: r.name,
      category: r.category as string,
      count: Number(r.total),
    }));

    if (isOptions) return flat;

    const groupMap = new Map<string, { category: string; items: { name: string; count: number }[] }>();
    for (const item of flat) {
      const g = groupMap.get(item.category) ?? { category: item.category, items: [] };
      if (g.items.length < CafesService.FILTER_ITEMS_PER_CATEGORY) {
        g.items.push({ name: item.name, count: item.count });
      }
      groupMap.set(item.category, g);
    }

    return { groups: Array.from(groupMap.values()) };
  }

  // ── Detail (MySQL — always fresh from source of truth) ─────────────────────

  async findOne(id: number) {
    const cafe = await this.cafesRepository.findOne({
      where: { id, isActive: true },
      relations: ['features', 'features.feature', 'menus', 'photos'],
    });
    if (!cafe) throw new NotFoundException('Cafe not found');

    const featureNames = (cafe.features || []).map((f) => f.feature?.name).filter(Boolean) as string[];
    const purposeMatchers = await this.loadPurposeMatchers();
    const { purposes, matchScore } = this.computePurposesAndScore(featureNames, purposeMatchers);

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

    let reviewsSummary: any[] = [];
    try {
      reviewsSummary = await this.dataSource.query(
        `SELECT rr.category, ROUND(AVG(rr.score), 1) AS avgScore, COUNT(*) AS count
         FROM review_ratings rr JOIN reviews r ON r.id = rr.review_id
         WHERE r.cafe_id = ? AND r.deleted_at IS NULL GROUP BY rr.category`,
        [id],
      );
    } catch {
      // reviews tables not created yet
    }

    const googleMapsUrl =
      cafe.googleMapsUrl || `https://maps.google.com/?q=${cafe.latitude},${cafe.longitude}`;

    return {
      ...cafe,
      slug: cafeSlugOrFallback(cafe),
      latitude: Number(cafe.latitude),
      longitude: Number(cafe.longitude),
      googleMapsUrl,
      googleRating: cafe.googleRating != null ? Number(cafe.googleRating) : null,
      purposes,
      purposeScores,
      detectedFacilities: featureNames,
      matchScore,
      reviewsSummary,
    };
  }

  // ── Discover deck (Meilisearch + shortlist exclusion + promo injection) ────

  async findDiscoverDeck(userId: number | null, dto: DiscoverCafesDto) {
    const targetSize = dto.limit ?? 7;

    let excludeIds: number[] = [];
    if (userId != null) {
      const rows = await this.dataSource.query<{ cafe_id: number }[]>(
        `SELECT cafe_id FROM shortlists WHERE user_id = ?`,
        [userId],
      );
      excludeIds = rows.map((r) => Number(r.cafe_id));
    }

    const searchResult = await this.meiliCafes.searchCafes({
      lat: dto.lat,
      lng: dto.lng,
      radius: dto.radius,
      facilities: dto.facilities,
      priceRange: dto.priceRange,
      purposeId: dto.purposeId,
      excludeIds,
      page: 1,
      limit: targetSize,
      sort: 'distance',
    });

    const regular = searchResult.data;

    if (regular.length === 0) {
      return {
        data: [],
        meta: { total: 0 },
      };
    }

    const excludeSet = new Set(excludeIds);
    const promoted = await this.findPromotedCafes();
    const promoA = promoted.find(
      (c: any) =>
        c.activePromotionType === 'new_cafe' && !excludeSet.has(c.id),
    );
    const promoB = promoted.find(
      (c: any) =>
        c.activePromotionType === 'featured_promo' && !excludeSet.has(c.id),
    );

    const deck: any[] = [...regular];
    const insertAt = (cafe: any) => {
      const pos = Math.min(deck.length, 1 + Math.floor(Math.random() * 3));
      deck.splice(pos, 0, cafe);
    };
    if (promoA) insertAt(promoA);
    if (promoB) insertAt(promoB);

    return {
      data: deck,
      meta: { total: deck.length },
    };
  }

  // ── Promoted (MySQL) ────────────────────────────────────────────────────────

  async findPromotedCafes(type?: string) {
    const qb = this.cafesRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.features', 'features')
      .leftJoinAndSelect('features.feature', 'feature')
      .leftJoinAndSelect('c.photos', 'photos')
      .where('c.isActive = :active', { active: true })
      .andWhere('c.hasActivePromotion = :promoted', { promoted: true });

    if (type) {
      qb.andWhere('c.activePromotionType = :type', { type });
    }

    const cafes = await qb.getMany();

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
      const featureNames = (cafe.features || []).map((f) => f.feature?.name).filter(Boolean) as string[];
      const { purposes, matchScore } = this.computePurposesAndScore(featureNames, purposeMatchers);
      return { ...cafe, purposes, matchScore, promotion: promoMap.get(cafe.id) || null };
    });
  }

  // ── Create (admin) ──────────────────────────────────────────────────────────

  async create(dto: CreateCafeDto) {
    const googleMapsUrl = `https://www.google.com/maps?q=${dto.latitude},${dto.longitude}`;

    const cafe = this.cafesRepository.create({
      name: dto.name,
      slug: null,
      description: dto.description,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      phone: dto.phone,
      googlePlaceId: dto.googlePlaceId,
      googleMapsUrl,
      openingHours: dto.openingHours,
      priceRange: dto.priceRange || '$$',
    } as Partial<Cafe>);

    const saved = await this.cafesRepository.save(cafe);

    saved.slug = buildCafeSlug(saved.name, saved.id);
    await this.cafesRepository.save(saved);

    if (dto.features?.length) {
      for (const f of dto.features) {
        const name = f.name.trim();
        if (!name) continue;
        // Upsert master features
        await this.dataSource.query(
          `INSERT INTO features (name, category) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
          [name, f.category ?? null],
        );
        const [{ id: featureId }] = await this.dataSource.query(
          `SELECT id FROM features WHERE name = ? LIMIT 1`,
          [name],
        );
        await this.dataSource.query(
          `INSERT INTO cafe_features (cafe_id, feature_id, source) VALUES (?, ?, 'manual')
           ON DUPLICATE KEY UPDATE source = 'manual'`,
          [saved.id, featureId],
        );
      }
    }

    return this.findOne(saved.id);
  }

  // ── Soft delete / restore (admin) ───────────────────────────────────────────

  async softRemove(id: number): Promise<void> {
    const cafe = await this.cafesRepository.findOne({ where: { id }, withDeleted: true });
    if (!cafe) throw new NotFoundException('Cafe not found');

    await this.dataSource.transaction(async (manager) => {
      const now = new Date();

      // Cascade soft delete to related entities
      await manager.query(
        `UPDATE cafe_menus SET deleted_at = ? WHERE cafe_id = ? AND deleted_at IS NULL`,
        [now, id],
      );
      await manager.query(
        `UPDATE cafe_photos SET deleted_at = ? WHERE cafe_id = ? AND deleted_at IS NULL`,
        [now, id],
      );
      await manager.query(
        `UPDATE reviews SET deleted_at = ? WHERE cafe_id = ? AND deleted_at IS NULL`,
        [now, id],
      );

      await manager.softDelete(Cafe, id);
    });

    // Remove from Meilisearch (fail-open — subscriber also fires but may race)
    try {
      await this.meiliCafes.removeCafe(id);
    } catch (err) {
      await this.meiliCafes.queueFailure(id, 'remove', String(err));
    }
  }

  async restore(id: number): Promise<void> {
    const cafe = await this.cafesRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!cafe) throw new NotFoundException('Cafe not found');
    if (!cafe.deletedAt) throw new NotFoundException('Cafe is not deleted');

    const deletedAt = cafe.deletedAt;

    await this.dataSource.transaction(async (manager) => {
      // Restore related entities deleted at the same time (within 1 second)
      const after = new Date(deletedAt.getTime() - 1000);
      await manager.query(
        `UPDATE cafe_menus SET deleted_at = NULL WHERE cafe_id = ? AND deleted_at >= ?`,
        [id, after],
      );
      await manager.query(
        `UPDATE cafe_photos SET deleted_at = NULL WHERE cafe_id = ? AND deleted_at >= ?`,
        [id, after],
      );
      await manager.query(
        `UPDATE reviews SET deleted_at = NULL WHERE cafe_id = ? AND deleted_at >= ?`,
        [id, after],
      );

      await manager.restore(Cafe, id);
    });

    // Re-index in Meilisearch
    try {
      await this.meiliCafes.indexCafe(id);
    } catch (err) {
      await this.meiliCafes.queueFailure(id, 'index', String(err));
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async loadPurposeMatchers(): Promise<PurposeMatcher[]> {
    const purposes = await this.dataSource.query(
      `SELECT id, name, slug FROM purposes ORDER BY display_order ASC`,
    );
    // Resolve feature name via JOIN — purpose_requirements.feature_id → features.name
    const reqs = await this.dataSource.query<{
      purposeId: number; featureName: string; isMandatory: number; weight: number;
    }[]>(
      `SELECT pr.purpose_id AS purposeId, f.name AS featureName,
              pr.is_mandatory AS isMandatory, pr.weight AS weight
       FROM purpose_requirements pr
       JOIN features f ON f.id = pr.feature_id`,
    );
    const reqsByPurpose = new Map<number, { featureName: string; isMandatory: boolean; weight: number }[]>();
    for (const r of reqs) {
      if (!reqsByPurpose.has(r.purposeId)) reqsByPurpose.set(r.purposeId, []);
      reqsByPurpose.get(r.purposeId)!.push({
        featureName: r.featureName,
        isMandatory: !!r.isMandatory,
        weight: r.weight,
      });
    }
    return purposes.map((p: any) => {
      const requirements = reqsByPurpose.get(p.id) || [];
      const maxScore = requirements.reduce((s: number, r: any) => s + r.weight, 0);
      return { id: p.id, name: p.name, slug: p.slug, requirements, maxScore };
    });
  }

  private computePurposesAndScore(
    featureNames: string[],
    matchers: PurposeMatcher[],
  ): { purposes: string[]; matchScore: number } {
    const strictMatches: { name: string; score: number }[] = [];
    const looseMatches: { name: string; score: number }[] = [];

    for (const p of matchers) {
      const mandatoryKeys = p.requirements.filter((r) => r.isMandatory).map((r) => r.featureName);
      const strictMet = mandatoryKeys.every((k) => featureNames.includes(k));
      const matchedWeight = p.requirements
        .filter((r) => featureNames.includes(r.featureName))
        .reduce((s, r) => s + r.weight, 0);
      const normalizedScore = p.maxScore > 0 ? Math.round((matchedWeight / p.maxScore) * 100) : 0;

      if (strictMet && matchedWeight > 0) {
        strictMatches.push({ name: p.name, score: normalizedScore });
      } else if (matchedWeight > 0) {
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

}
