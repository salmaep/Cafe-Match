import { Injectable, Logger } from '@nestjs/common';
import { MeiliCafesService, CafeHit } from '../meili/meili-cafes.service';
import { QueryRewriterService } from './query-rewriter.service';
import { RerankerService } from './reranker.service';
import { SemanticCacheService } from './semantic-cache.service';
import { SemanticSearchDto, ParsedQuery } from './dto/semantic-search.dto';

export interface SemanticSearchResult {
  data: CafeHit[];
  meta: {
    total: number;
    page: number;
    limit: number;
    aiUsed: boolean;
    cached: boolean;
    parsed: ParsedQuery | null;
    searchedRadius: number;
    suggestedRadius: number | null;
    totalIfExpanded: number | null;
  };
}

const MIN_RESULTS_FOR_EXPAND = 3;
const EXPAND_FACTOR = 5;
const MAX_EXPAND_RADIUS = 50000;

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(
    private readonly meili: MeiliCafesService,
    private readonly rewriter: QueryRewriterService,
    private readonly reranker: RerankerService,
    private readonly cache: SemanticCacheService,
  ) {}

  async search(dto: SemanticSearchDto): Promise<SemanticSearchResult> {
    const {
      q,
      lat,
      lng,
      radius = 2000,
      limit = 7,
      page = 1,
      sort,
      purposeId,
      priceRange: dtoPrice,
      facilities: dtoFacilities,
    } = dto;

    const topN = Math.min(limit, 30);

    // [0] Cache lookup
    const { hash, geoBucket } = this.cache.buildHash(q, lat, lng, radius);
    const cached = await this.cache.get(hash, geoBucket);
    if (cached) {
      return {
        data: cached.hits.slice(0, topN),
        meta: {
          total: cached.hits.length,
          page,
          limit: topN,
          aiUsed: cached.parsed !== null,
          cached: true,
          parsed: cached.parsed,
          searchedRadius: radius,
          suggestedRadius: null,
          totalIfExpanded: null,
        },
      };
    }

    // [1+2] Query rewriting via Haiku. rewriter.rewrite() never throws —
    // it logs and returns null on any AI failure, so we don't wrap in try/catch.
    const parsed = await this.rewriter.rewrite(q);
    const aiUsed = parsed !== null;

    // [3] Meili retrieval — 30 candidates.
    // User-supplied filters take precedence over AI-inferred ones.
    const facilities =
      dtoFacilities?.length
        ? dtoFacilities
        : parsed?.facilities?.length
          ? parsed.facilities
          : undefined;
    const priceRange = dtoPrice ?? parsed?.priceRange ?? undefined;

    const meiliQ = parsed?.keywords ?? q;
    let meiliResult = await this.meili.searchCafes({
      q: meiliQ,
      lat,
      lng,
      radius,
      facilities,
      priceRange,
      purposeId,
      sort,
      page: 1,
      limit: 30,
    });

    // Safety net: AI keywords may not match Meili's full-text index (e.g. for
    // "near me" queries where keywords end up as "terdekat"). When we have geo
    // params, retry once with empty q so geo filter + sort still apply.
    if (!meiliResult.data.length && meiliQ && lat != null && lng != null) {
      this.logger.debug(
        `Empty result for q="${meiliQ}", retrying with empty q (geo-only)`,
      );
      meiliResult = await this.meili.searchCafes({
        q: '',
        lat,
        lng,
        radius,
        facilities,
        priceRange,
        purposeId,
        sort,
        page: 1,
        limit: 30,
      });
    }

    let hits: CafeHit[] = meiliResult.data;

    // Radius UX: when results are sparse and geo is set, probe a larger radius
    // to tell the client how much wider it needs to go for more hits. Probe is
    // cheap (limit=1) — we only want the total count, not the documents.
    let suggestedRadius: number | null = null;
    let totalIfExpanded: number | null = null;
    if (
      hits.length < MIN_RESULTS_FOR_EXPAND &&
      lat != null &&
      lng != null &&
      radius < MAX_EXPAND_RADIUS
    ) {
      const expandedRadius = Math.min(radius * EXPAND_FACTOR, MAX_EXPAND_RADIUS);
      try {
        const probe = await this.meili.searchCafes({
          q: meiliQ,
          lat,
          lng,
          radius: expandedRadius,
          facilities,
          priceRange,
          purposeId,
          sort,
          page: 1,
          limit: 1,
        });
        const probeTotal = probe.meta?.total ?? 0;
        if (probeTotal > hits.length) {
          suggestedRadius = expandedRadius;
          totalIfExpanded = probeTotal;
        }
      } catch (err) {
        this.logger.debug(`Radius probe failed (non-fatal): ${String(err)}`);
      }
    }

    if (!hits.length) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit: topN,
          aiUsed,
          cached: false,
          parsed,
          searchedRadius: radius,
          suggestedRadius,
          totalIfExpanded,
        },
      };
    }

    // [4] Haiku rerank. reranker.rerank() handles its own errors and
    // gracefully returns hits.slice(0, topN) on failure.
    hits = aiUsed && hits.length > 1
      ? await this.reranker.rerank(q, hits, topN)
      : hits.slice(0, topN);

    // [5] Cache result — only when AI succeeded. We don't want to serve a
    // stale fallback result after Meridian recovers.
    if (aiUsed) {
      await this.cache.set(hash, geoBucket, parsed, hits);
    }

    return {
      data: hits,
      meta: {
        total: hits.length,
        page,
        limit: topN,
        aiUsed,
        cached: false,
        parsed,
        searchedRadius: radius,
        suggestedRadius,
        totalIfExpanded,
      },
    };
  }

  async fallbackSearch(dto: SemanticSearchDto): Promise<SemanticSearchResult> {
    const { q, lat, lng, radius = 2000, limit = 7, page = 1, sort, purposeId, priceRange, facilities } = dto;
    const topN = Math.min(limit, 30);
    const result = await this.meili.searchCafes({
      q,
      lat,
      lng,
      radius,
      purposeId,
      priceRange,
      facilities,
      sort,
      page,
      limit: topN,
    });
    return {
      data: result.data,
      meta: {
        total: result.meta.total,
        page,
        limit: topN,
        aiUsed: false,
        cached: false,
        parsed: null,
        searchedRadius: radius,
        suggestedRadius: null,
        totalIfExpanded: null,
      },
    };
  }
}
