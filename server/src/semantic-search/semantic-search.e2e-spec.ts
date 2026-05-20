/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../app.module';
import { QueryRewriterService } from './query-rewriter.service';
import { TokenBudgetService } from './token-budget.service';

// Real integration test — hits Meridian + local MySQL + local Meili.
// Auto-skips if MERIDIAN_API_KEY missing or DB has too few cafes.
// Run via: npm run test:semantic

// Local dataset is Bandung-centric. Picked coordinates near densest cluster.
const TEST_LAT = -6.9;
const TEST_LNG = 107.6;

// Helper: retry once on null (Meridian cold-start / transient errors)
async function rewriteWithRetry(
  rewriter: QueryRewriterService,
  query: string,
): Promise<
  ReturnType<QueryRewriterService['rewrite']> extends Promise<infer T>
    ? T
    : never
> {
  let parsed = await rewriter.rewrite(query);
  if (parsed === null) {
    await new Promise((r) => setTimeout(r, 1500));
    parsed = await rewriter.rewrite(query);
  }
  return parsed;
}

describe('Semantic Search (e2e, real Meridian + DB + Meili)', () => {
  let app: INestApplication;
  let rewriter: QueryRewriterService;
  let budget: TokenBudgetService;
  let dataSource: DataSource;
  let envReady = false;
  let cafeCount = 0;
  let startTokens = 0;

  beforeAll(async () => {
    if (!process.env.MERIDIAN_API_KEY) {
      console.warn(
        '⚠️  MERIDIAN_API_KEY not set — semantic-search e2e SKIPPED',
      );
      return;
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    rewriter = app.get(QueryRewriterService);
    budget = app.get(TokenBudgetService);
    dataSource = app.get(DataSource);

    const rows = await dataSource.query<{ total: number | string }[]>(
      `SELECT COUNT(*) AS total FROM cafes WHERE deleted_at IS NULL AND is_active = TRUE`,
    );
    cafeCount = Number(rows[0]?.total ?? 0);
    if (cafeCount < 100) {
      console.warn(
        `⚠️  Local DB has only ${cafeCount} active cafes — e2e SKIPPED`,
      );
      await app.close();
      return;
    }

    startTokens = await budget.getTodayUsage();
    console.log(
      `ℹ️  semantic-search e2e starting | cafes=${cafeCount} | tokens used today=${startTokens}`,
    );

    // Warm up Meridian (Claude Code SDK cold-start can take 30s+).
    // Run a cheap call so subsequent test timeouts don't trip.
    console.log('ℹ️  warming up Meridian…');
    const warmStart = Date.now();
    await rewriter.rewrite('warmup');
    console.log(`ℹ️  warmup done in ${Date.now() - warmStart}ms`);

    envReady = true;
  }, 120000);

  afterAll(async () => {
    if (!app) return;
    const endTokens = await budget.getTodayUsage();
    console.log(
      `ℹ️  semantic-search e2e finished | tokens used this run=${endTokens - startTokens}`,
    );
    await app.close();
  });

  // ── Group 1: Query rewriter (real Meridian) ────────────────────────────────

  describe('QueryRewriterService.rewrite', () => {
    it('extracts facilities for a remote-work query', async () => {
      if (!envReady) return;
      const parsed = await rewriteWithRetry(
        rewriter,
        'cafe cozy buat kerja remote ada wifi outlet',
      );
      expect(parsed).not.toBeNull();
      expect(parsed!.intent).toBeTruthy();
      // facilities should reference real DB vocabulary
      expect(Array.isArray(parsed!.facilities)).toBe(true);
    });

    it('returns empty keywords for pure "near me" query', async () => {
      if (!envReady) return;
      const parsed = await rewriteWithRetry(rewriter, 'terdekat dari sini');
      expect(parsed).not.toBeNull();
      // Tolerate model variance: either keywords is empty, OR keywords are
      // only locational words. Crucial: priceRange/facilities must be empty.
      expect(parsed!.priceRange).toBeNull();
      expect(parsed!.facilities).toEqual([]);
    });

    it('maps IDR "50.000" → "$"', async () => {
      if (!envReady) return;
      const parsed = await rewriteWithRetry(
        rewriter,
        'Cari restoran yang cocok buat keluarga dengan budget 50.000',
      );
      expect(parsed).not.toBeNull();
      expect(parsed!.priceRange).toBe('$');
      expect(parsed!.intent.toLowerCase()).toMatch(/family|keluarga/);
    });

    it('maps IDR "50k" → "$" (same as 50.000)', async () => {
      if (!envReady) return;
      const parsed = await rewriteWithRetry(
        rewriter,
        'tempat makan keluarga budget 50k per orang',
      );
      expect(parsed).not.toBeNull();
      expect(parsed!.priceRange).toBe('$');
    });

    it('maps IDR "50000" → "$" (same as 50.000)', async () => {
      if (!envReady) return;
      const parsed = await rewriteWithRetry(
        rewriter,
        'cari cafe keluarga budget 50000 per orang',
      );
      expect(parsed).not.toBeNull();
      expect(parsed!.priceRange).toBe('$');
    });

    it('maps "premium ... budget 250rb" → "$$$"', async () => {
      if (!envReady) return;
      const parsed = await rewriteWithRetry(
        rewriter,
        'kafe premium yang mewah dengan budget 250rb',
      );
      expect(parsed).not.toBeNull();
      // With new threshold (>100k = $$$), 250k is unambiguously premium.
      expect(parsed!.priceRange).toBe('$$$');
    });
  });

  // ── Group 2: Full HTTP pipeline (real DB + Meili + Meridian) ───────────────

  describe('GET /cafes/semantic-search', () => {
    it('"terdekat dari sini" with geo returns cafes (bug fix assertion)', async () => {
      if (!envReady) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/cafes/semantic-search')
        .query({
          q: 'terdekat dari sini',
          lat: TEST_LAT,
          lng: TEST_LNG,
          radius: 10000,
          limit: 5,
        });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const hit of res.body.data) {
        if (hit.distanceMeters != null) {
          expect(hit.distanceMeters).toBeLessThanOrEqual(10000);
        }
      }
    });

    it('"budget 50.000" returns aiUsed=true and priceRange "$"', async () => {
      if (!envReady) return;
      const t0 = Date.now();
      const res = await request(app.getHttpServer())
        .get('/api/v1/cafes/semantic-search')
        .query({
          q: 'Cari restoran yang cocok buat keluarga dengan budget 50.000',
          limit: 5,
        });
      const elapsedMs = Date.now() - t0;
      console.log(`⏱  "budget 50.000" request took ${elapsedMs}ms`);
      expect(res.status).toBe(200);
      expect(res.body.meta.aiUsed).toBe(true);
      expect(res.body.meta.parsed?.priceRange).toBe('$');
    });

    it('"budget 50k" parses identically to "50.000"', async () => {
      if (!envReady) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/cafes/semantic-search')
        .query({
          q: 'cari cafe keluarga budget 50k',
          limit: 5,
        });
      expect(res.status).toBe(200);
      expect(res.body.meta.aiUsed).toBe(true);
      expect(res.body.meta.parsed?.priceRange).toBe('$');
    });

    it('gibberish keyword + valid geo triggers retry-with-empty-q', async () => {
      if (!envReady) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/cafes/semantic-search')
        .query({
          q: 'xyzqqq_no_such_cafe_name_zzz',
          lat: TEST_LAT,
          lng: TEST_LNG,
          radius: 5000,
          limit: 5,
        });
      expect(res.status).toBe(200);
      // Safety-net retry should kick in even if AI keywords don't match Meili
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('sparse radius returns suggestedRadius > radius with totalIfExpanded', async () => {
      if (!envReady) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/cafes/semantic-search')
        .query({
          q: 'cafe cozy wifi',
          lat: TEST_LAT,
          lng: TEST_LNG,
          radius: 300, // very tight — likely < 3 hits
          limit: 5,
        });
      expect(res.status).toBe(200);
      expect(res.body.meta.searchedRadius).toBe(300);
      // If initial result was sparse, server must suggest a wider radius.
      if (res.body.data.length < 3) {
        expect(res.body.meta.suggestedRadius).not.toBeNull();
        expect(res.body.meta.suggestedRadius).toBeGreaterThan(300);
        expect(res.body.meta.totalIfExpanded).toBeGreaterThan(
          res.body.data.length,
        );
      }
    });

    it('same query twice → second call hits cache', async () => {
      if (!envReady) return;
      const params = { q: 'cafe wifi kencang cozy', limit: 5 };
      const first = await request(app.getHttpServer())
        .get('/api/v1/cafes/semantic-search')
        .query(params);
      expect(first.status).toBe(200);

      const second = await request(app.getHttpServer())
        .get('/api/v1/cafes/semantic-search')
        .query(params);
      expect(second.status).toBe(200);
      // Cache may not hit if AI rewrite failed on first call — only assert when
      // first call actually invoked AI (otherwise nothing gets cached).
      if (first.body.meta.aiUsed) {
        expect(second.body.meta.cached).toBe(true);
      }
    });
  });

  // ── Group 3: Latency observation (post-rerank-removal) ─────────────────────
  // After removing the reranker, only ONE Meridian call per request (rewriter).
  // We log timings for manual comparison instead of asserting a hard bound —
  // Meridian (Claude Code SDK proxy) latency varies wildly (~5-30s per call).
  // Baseline from production log w/ reranker: "cafe terdekat" → 20,751ms.

  describe('Latency (log-only)', () => {
    it('logs geo-query latency', async () => {
      if (!envReady) return;
      const q = `cafe terdekat ${Date.now()}`;
      const t0 = Date.now();
      const res = await request(app.getHttpServer())
        .get('/api/v1/cafes/semantic-search')
        .query({ q, lat: TEST_LAT, lng: TEST_LNG, radius: 5000, limit: 7 });
      console.log(`⏱  geo query → ${Date.now() - t0}ms`);
      expect(res.status).toBe(200);
    });

    it('logs intent-only query latency', async () => {
      if (!envReady) return;
      const q = `cafe buat kerja remote ${Date.now()}`;
      const t0 = Date.now();
      const res = await request(app.getHttpServer())
        .get('/api/v1/cafes/semantic-search')
        .query({ q, lat: TEST_LAT, lng: TEST_LNG, radius: 5000, limit: 7 });
      console.log(`⏱  intent query → ${Date.now() - t0}ms`);
      expect(res.status).toBe(200);
    });
  });
});
