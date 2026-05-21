import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { SearchParams, SearchResponse } from 'meilisearch';
import { MeiliService } from './meili.service';
import { CafeDocument, toCafeDocument } from './helpers/cafe-to-document';

// ── Row shapes from raw SQL ──────────────────────────────────────────────────

interface CafeRow {
  id: number;
  [key: string]: unknown;
}

interface FeatureRow {
  cafeId: number;
  name: string;
  category: string | null;
}

interface PhotoRow {
  cafeId: number;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
}

interface MenuRow {
  cafeId: number;
  itemName: string;
}

interface PurposeTagRow {
  cafeId: number;
  purposeSlug: string;
}

interface TopReviewRow {
  cafeId: number;
  text: string | null;
  authorName: string | null;
  overallScore: number | null;
  createdAt: string | Date | null;
}

interface SyncFailureRow {
  id: number;
  cafe_id: number;
  operation: 'index' | 'remove';
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface SearchCafesQuery {
  q?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  facilities?: string[];
  priceRange?: string;
  purposeId?: number;
  excludeIds?: number[];
  page?: number;
  limit?: number;
  sort?: string;
}

export type CafeHit = CafeDocument & {
  distanceMeters?: number;
  distance?: number;
};

export interface CafeSearchResult {
  data: CafeHit[];
  meta: { page: number; limit: number; total: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function groupBy<T, K extends keyof T>(
  arr: T[],
  key: K,
): Record<string | number, T[]> {
  const map: Record<string | number, T[]> = {};
  for (const item of arr) {
    const k = item[key] as string | number;
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MeiliCafesService {
  private readonly logger = new Logger(MeiliCafesService.name);
  private readonly purposeSlugCache = new Map<number, string>();

  constructor(
    private readonly meili: MeiliService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Index operations ────────────────────────────────────────────────────────

  async indexCafe(cafeId: number): Promise<void> {
    const [doc] = await this.buildDocumentsBatch([cafeId]);
    if (!doc) return;
    // addDocuments() returns once Meili has *enqueued* the task — but the
    // index isn't yet searchable with the new data. For interactive flows
    // like bookmark/favorite toggles we want the next search to see the
    // fresh counts immediately, so wait until the task is processed.
    await this.waitForTaskSafe(
      this.meili.getIndex().addDocuments([doc]).waitTask(this.WAIT_OPTS),
    );
  }

  async indexCafes(cafeIds: number[]): Promise<void> {
    if (!cafeIds.length) return;
    const docs = await this.buildDocumentsBatch(cafeIds);
    if (docs.length) {
      await this.waitForTaskSafe(
        this.meili.getIndex().addDocuments(docs).waitTask(this.WAIT_OPTS),
      );
    }
  }

  async removeCafe(cafeId: number): Promise<void> {
    await this.waitForTaskSafe(
      this.meili.getIndex().deleteDocument(cafeId).waitTask(this.WAIT_OPTS),
    );
  }

  // Swallow Meili task timeouts — we don't want a slow Meili to fail the DB
  // transaction that triggered the index. The retry queue picks up failures
  // via `queueFailure` in the entity subscriber.
  private readonly WAIT_OPTS = { timeout: 2000, interval: 30 };
  private async waitForTaskSafe(p: Promise<unknown>): Promise<void> {
    try {
      await p;
    } catch (err) {
      this.logger.warn(`Meili task did not finish in time: ${String(err)}`);
    }
  }

  async reindexAll(): Promise<{ total: number }> {
    const indexName = this.config.get<string>('MEILI_CAFES_INDEX', 'cafes');
    const tmpName = `${indexName}_tmp_${Date.now()}`;

    try {
      await this.meili.getClient().createIndex(tmpName, { primaryKey: 'id' });
      const tmpIndex = this.meili.getClient().index(tmpName);
      await this.meili.applySettingsToIndex(tmpIndex);

      const [countRow] = await this.q<{ total: string }>(
        `SELECT COUNT(*) AS total FROM cafes WHERE deleted_at IS NULL AND is_active = TRUE`,
      );
      const dbTotal = Number(countRow.total);

      const batchSize = 500;
      let offset = 0;
      let indexed = 0;

      for (;;) {
        const rows = await this.q<{ id: number }>(
          `SELECT id FROM cafes WHERE deleted_at IS NULL AND is_active = TRUE LIMIT ? OFFSET ?`,
          [batchSize, offset],
        );
        if (!rows.length) break;

        const docs = await this.buildDocumentsBatch(rows.map((r) => r.id));
        if (docs.length) await tmpIndex.addDocuments(docs);

        indexed += docs.length;
        offset += batchSize;
        this.logger.log(`Reindex progress: ${indexed}/${dbTotal}`);
      }

      await this.meili
        .getClient()
        .swapIndexes([{ indexes: [indexName, tmpName], rename: false }]);
      await this.meili
        .getClient()
        .deleteIndex(tmpName)
        .catch(() => null);

      this.logger.log(`Reindex complete: ${indexed} cafes`);
      return { total: indexed };
    } catch (err) {
      await this.meili
        .getClient()
        .deleteIndex(tmpName)
        .catch(() => null);
      throw err;
    }
  }

  // ── Retry queue ─────────────────────────────────────────────────────────────

  async resyncFailed(): Promise<{ processed: number; failed: number }> {
    const rows = await this.q<SyncFailureRow>(
      `SELECT id, cafe_id, operation FROM meili_sync_failures WHERE retry_count < 5 ORDER BY created_at ASC LIMIT 200`,
    );

    let processed = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        if (row.operation === 'remove') {
          await this.removeCafe(row.cafe_id);
        } else {
          await this.indexCafe(row.cafe_id);
        }
        await this.q(`DELETE FROM meili_sync_failures WHERE id = ?`, [row.id]);
        processed++;
      } catch (err) {
        await this.q(
          `UPDATE meili_sync_failures SET retry_count = retry_count + 1, error = ? WHERE id = ?`,
          [String(err), row.id],
        );
        failed++;
      }
    }

    return { processed, failed };
  }

  async queueFailure(
    cafeId: number,
    operation: 'index' | 'remove',
    error: string,
  ): Promise<void> {
    try {
      await this.q(
        `INSERT INTO meili_sync_failures (cafe_id, operation, error) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE retry_count = retry_count + 1, error = VALUES(error)`,
        [cafeId, operation, error],
      );
    } catch {
      // Best-effort — never throw from failure queue
    }
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  async searchCafes(dto: SearchCafesQuery): Promise<CafeSearchResult> {
    const {
      q = '',
      lat,
      lng,
      radius = 2000,
      facilities,
      priceRange,
      purposeId,
      excludeIds,
      page = 1,
      limit = 50,
      sort: sortMode,
    } = dto;

    const filters: string[] = ['isActive = true'];

    if (lat != null && lng != null) {
      filters.push(`_geoRadius(${lat}, ${lng}, ${radius})`);
    }
    if (priceRange) filters.push(`priceRange = "${priceRange}"`);

    // facilities[] = feature names. Cafe matches if it has ANY of the requested names.
    if (facilities && facilities.length > 0) {
      const escaped = facilities
        .map((k) => `"${k.replace(/"/g, '\\"')}"`)
        .join(', ');
      filters.push(`facilities IN [${escaped}]`);
    }

    if (purposeId) {
      const slug = await this.resolvePurposeSlug(purposeId);
      if (slug) filters.push(`purposes = "${slug}"`);
    }

    if (excludeIds && excludeIds.length > 0) {
      filters.push(`NOT id IN [${excludeIds.join(', ')}]`);
    }

    const sort: string[] = [];
    if (sortMode === 'trending') {
      sort.push(
        'favoritesCount:desc',
        'bookmarksCount:desc',
        'googleRating:desc',
      );
    } else if (sortMode === 'rating') {
      sort.push('googleRating:desc', 'favoritesCount:desc');
    } else if (sortMode === 'newest') {
      sort.push('createdAt:desc');
    } else if (lat != null && lng != null) {
      sort.push(`_geoPoint(${lat}, ${lng}):asc`);
    }

    const searchParams: SearchParams = {
      filter: filters.join(' AND '),
      offset: (page - 1) * limit,
      limit,
      ...(sort.length ? { sort } : {}),
    };

    let results: SearchResponse<CafeDocument>;
    try {
      results = await this.meili
        .getIndex()
        .search<CafeDocument>(q, searchParams);
    } catch (err) {
      this.logger.error('Meilisearch search failed', err);
      throw new ServiceUnavailableException({ error: 'SEARCH_UNAVAILABLE' });
    }

    const hits: CafeHit[] = results.hits.map((hit) => {
      if (lat != null && lng != null && hit._geo) {
        const distMeters = Math.round(
          haversineMeters(lat, lng, hit._geo.lat, hit._geo.lng),
        );
        return {
          ...hit,
          distanceMeters: distMeters,
          distance: Math.round(distMeters / 100) / 10,
        };
      }
      return hit;
    });

    return {
      data: hits,
      meta: {
        page,
        limit,
        total: results.estimatedTotalHits ?? results.hits.length,
      },
    };
  }

  // ── Facets ──────────────────────────────────────────────────────────────────

  /**
   * Returns distribution of `facilities` values (feature names) across all
   * active cafes. Used by GET /cafes/filters to show counts. Cached 60s.
   */
  async getFacilityCounts(): Promise<Record<string, number>> {
    const now = Date.now();
    if (this.facilityCountsCache && now - this.facilityCountsCacheAt < 60_000) {
      return this.facilityCountsCache;
    }

    try {
      const result = await this.meili.getIndex().search('', {
        facets: ['facilities'],
        filter: 'isActive = true',
        limit: 0,
      });
      const dist =
        (result.facetDistribution?.facilities as Record<string, number>) ?? {};
      this.facilityCountsCache = dist;
      this.facilityCountsCacheAt = now;
      return dist;
    } catch (err) {
      this.logger.warn(`Facet distribution fetch failed: ${err}`);
      return this.facilityCountsCache ?? {};
    }
  }

  private facilityCountsCache: Record<string, number> | null = null;
  private facilityCountsCacheAt = 0;

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async resolvePurposeSlug(purposeId: number): Promise<string | null> {
    const cached = this.purposeSlugCache.get(purposeId);
    if (cached) return cached;

    const rows = await this.q<{ slug: string }>(
      `SELECT slug FROM purposes WHERE id = ? LIMIT 1`,
      [purposeId],
    );
    const slug = rows[0]?.slug;
    if (slug) this.purposeSlugCache.set(purposeId, slug);
    return slug ?? null;
  }

  private async buildDocumentsBatch(
    cafeIds: number[],
  ): Promise<CafeDocument[]> {
    if (!cafeIds.length) return [];

    const placeholders = cafeIds.map(() => '?').join(',');

    const [cafes, features, photos, menus, topReviews] = await Promise.all([
      this.q<CafeRow>(
        `SELECT * FROM cafes WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
        cafeIds,
      ),
      this.q<FeatureRow>(
        `SELECT cf.cafe_id AS cafeId, f.name, f.category
         FROM cafe_features cf
         JOIN features f ON f.id = cf.feature_id
         WHERE cf.cafe_id IN (${placeholders})`,
        cafeIds,
      ),
      this.q<PhotoRow>(
        `SELECT cafe_id AS cafeId, url, is_primary AS isPrimary, display_order AS displayOrder
         FROM cafe_photos WHERE cafe_id IN (${placeholders}) AND deleted_at IS NULL
         ORDER BY display_order ASC`,
        cafeIds,
      ),
      this.q<MenuRow>(
        `SELECT cafe_id AS cafeId, item_name AS itemName
         FROM cafe_menus WHERE cafe_id IN (${placeholders}) AND deleted_at IS NULL`,
        cafeIds,
      ),
      // Latest non-empty review per cafe. CafeMatch user reviews take priority;
      // falls back to the highest-rated Google review when no user review exists.
      this.q<TopReviewRow>(
        `SELECT cafeId, text, createdAt, authorName, overallScore
         FROM (
           SELECT t.cafe_id AS cafeId, t.text, t.created_at AS createdAt,
                  u.name AS authorName,
                  (SELECT rr.score FROM review_ratings rr
                    WHERE rr.review_id = t.id AND rr.category = 'overall' LIMIT 1) AS overallScore,
                  1 AS priority,
                  ROW_NUMBER() OVER (PARTITION BY t.cafe_id ORDER BY t.created_at DESC) AS rn
           FROM reviews t
           LEFT JOIN users u ON u.id = t.user_id
           WHERE t.cafe_id IN (${placeholders})
             AND t.deleted_at IS NULL
             AND t.text IS NOT NULL
             AND TRIM(t.text) <> ''

           UNION ALL

           SELECT g.cafe_id AS cafeId, g.comment AS text, g.scraped_at AS createdAt,
                  g.guest_name AS authorName,
                  g.rating AS overallScore,
                  2 AS priority,
                  ROW_NUMBER() OVER (PARTITION BY g.cafe_id ORDER BY g.rating DESC, g.scraped_at DESC) AS rn
           FROM cafe_google_reviews g
           WHERE g.cafe_id IN (${placeholders})
             AND g.comment IS NOT NULL
             AND TRIM(g.comment) <> ''
         ) combined
         WHERE rn = 1
           AND (cafeId, priority) IN (
             SELECT cafeId, MIN(priority)
             FROM (
               SELECT cafe_id AS cafeId, 1 AS priority FROM reviews
               WHERE cafe_id IN (${placeholders}) AND deleted_at IS NULL AND text IS NOT NULL AND TRIM(text) <> ''
               UNION ALL
               SELECT cafe_id AS cafeId, 2 AS priority FROM cafe_google_reviews
               WHERE cafe_id IN (${placeholders}) AND comment IS NOT NULL AND TRIM(comment) <> ''
             ) src
             GROUP BY cafeId
           )`,
        [...cafeIds, ...cafeIds, ...cafeIds, ...cafeIds],
      ).catch(() => [] as TopReviewRow[]),
    ]);

    let tagRows: PurposeTagRow[] = [];
    try {
      tagRows = await this.q<PurposeTagRow>(
        `SELECT cafe_id AS cafeId, purpose_slug AS purposeSlug
         FROM cafe_purpose_tags WHERE cafe_id IN (${placeholders}) AND score >= 40`,
        cafeIds,
      );
    } catch {
      // Table may not exist — OK
    }

    const featureMap = groupBy(features, 'cafeId');
    const photoMap = groupBy(photos, 'cafeId');
    const menuMap = groupBy(menus, 'cafeId');
    const tagMap = groupBy(tagRows, 'cafeId');
    const topReviewMap: Record<number, TopReviewRow> = {};
    for (const r of topReviews) topReviewMap[r.cafeId] = r;

    return cafes.map((cafe) =>
      toCafeDocument({
        cafe,
        features: featureMap[cafe.id] ?? [],
        photos: (photoMap[cafe.id] ?? []).slice(0, 10),
        menus: (menuMap[cafe.id] ?? []).slice(0, 20),
        purposeSlugs: (tagMap[cafe.id] ?? []).map((t) => t.purposeSlug),
        topReview: topReviewMap[cafe.id]
          ? {
              text: topReviewMap[cafe.id].text,
              authorName: topReviewMap[cafe.id].authorName,
              overallScore:
                topReviewMap[cafe.id].overallScore != null
                  ? Number(topReviewMap[cafe.id].overallScore)
                  : null,
              createdAt: topReviewMap[cafe.id].createdAt,
            }
          : null,
      }),
    );
  }

  // Typed wrapper for DataSource.query — isolates the any boundary to one place.
  private q<T = void>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.dataSource.query(sql, params);
  }
}
