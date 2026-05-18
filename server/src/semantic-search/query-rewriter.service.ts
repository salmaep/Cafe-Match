/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-base-to-string */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MeridianClient } from './meridian.client';
import { TokenBudgetService } from './token-budget.service';
import { ParsedQuery } from './dto/semantic-search.dto';

@Injectable()
export class QueryRewriterService implements OnModuleInit {
  private readonly logger = new Logger(QueryRewriterService.name);
  private purposeSlugs: string[] = [];
  private allowedFacilities: string[] = [];
  private allowedFacilitySet = new Set<string>();
  private systemPrompt = '';

  // Top-N most-common facility names to expose to the AI. Limits prompt size
  // while still covering the long tail of features users actually search for.
  private static readonly TOP_FACILITY_LIMIT = 80;

  constructor(
    private readonly meridian: MeridianClient,
    private readonly budget: TokenBudgetService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await Promise.all([
      this.refreshPurposeSlugs(),
      this.refreshFacilityVocabulary(),
    ]);
    this.buildSystemPrompt();
    this.logger.log(
      `Vocabulary loaded: ${this.allowedFacilities.length} facilities, ${this.purposeSlugs.length} purposes`,
    );
  }

  async rewrite(query: string): Promise<ParsedQuery | null> {
    if (!(await this.budget.canSpend())) return null;

    try {
      const resp = await this.meridian.chat(this.systemPrompt, [
        { role: 'user', content: `Query: "${query}"` },
      ]);

      await this.budget.record(resp.inputTokens, resp.outputTokens);

      const parsed = this.parseJsonOutput(resp.content);
      if (!parsed) {
        this.logger.warn(
          `Query rewriter returned unparseable JSON: ${resp.content}`,
        );
        return null;
      }

      const result: ParsedQuery = {
        keywords: String(parsed.keywords ?? query).slice(0, 100),
        facilities: this.filterFacilities(parsed.facilities),
        purposeSlug: this.filterPurposeSlug(parsed.purposeSlug),
        priceRange: this.filterPriceRange(parsed.priceRange),
        intent: String(parsed.intent ?? '').slice(0, 50),
      };

      this.logger.debug(`Rewriter result: ${JSON.stringify(result)}`);
      return result;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Query rewriter skipped → fallback to raw Meili. Reason: ${reason}`,
      );
      return null;
    }
  }

  private async refreshPurposeSlugs(): Promise<void> {
    try {
      const rows = await this.dataSource.query<{ slug: string }[]>(
        `SELECT slug FROM purposes ORDER BY display_order ASC`,
      );
      this.purposeSlugs = rows.map((r) => r.slug);
    } catch (err) {
      this.logger.warn(`Failed to load purpose slugs: ${String(err)}`);
      this.purposeSlugs = [];
    }
  }

  // Loads actual facility names from the database, ordered by usage frequency.
  // This is the vocabulary that ACTUALLY exists in cafe_features.name — using
  // the static catalog would cause filter MISSes since data uses raw names
  // like "Wifi", "Cozy", "Outdoor" rather than canonical kebab_case slugs.
  private async refreshFacilityVocabulary(): Promise<void> {
    try {
      const rows = await this.dataSource.query<{ name: string }[]>(
        `SELECT f.name, COUNT(*) AS total
         FROM cafe_features cf
         JOIN features f ON f.id = cf.feature_id
         JOIN cafes c ON c.id = cf.cafe_id
         WHERE c.deleted_at IS NULL AND c.is_active = TRUE
           AND f.name IS NOT NULL AND f.name != ''
         GROUP BY f.name
         ORDER BY total DESC, f.name ASC
         LIMIT ?`,
        [QueryRewriterService.TOP_FACILITY_LIMIT],
      );
      this.allowedFacilities = rows.map((r) => r.name);
      this.allowedFacilitySet = new Set(this.allowedFacilities);
    } catch (err) {
      this.logger.warn(`Failed to load facility vocabulary: ${String(err)}`);
      this.allowedFacilities = [];
      this.allowedFacilitySet = new Set();
    }
  }

  private buildSystemPrompt(): void {
    const facilities = this.allowedFacilities.join(', ');
    const purposes = this.purposeSlugs.join(', ');

    this.systemPrompt = `You parse Indonesian/English cafe search queries into structured filters.
Output ONLY valid JSON — no markdown, no code fences, no commentary.

Schema:
{
  "keywords": string,
  "facilities": string[],
  "purposeSlug": string | null,
  "priceRange": "$" | "$$" | "$$$" | null,
  "intent": string
}

ALLOWED_FACILITIES: [${facilities}]
ALLOWED_PURPOSES: [${purposes || 'none'}]

Rules:
- keywords: 1-5 words for Meili full-text search. Should match cafe name, menu, or review text.
  IMPORTANT: If the query is purely locational with no specific attribute (e.g. "terdekat",
  "dekat sini", "near me", "around here", "di sekitar saya", "yang terdekat"), set keywords = "".
  IMPORTANT: If the query mentions a venue type only (e.g. "restoran", "tempat makan") but no
  specific attribute, set keywords = "" or to the short intent label only — DO NOT pass the
  generic word as keywords because our index only contains cafes and the word will not match.
- facilities: only values from ALLOWED_FACILITIES; empty array if none match.
- purposeSlug: one value from ALLOWED_PURPOSES or null.
- priceRange: First normalize any IDR amount in the query to an integer:
    "50.000", "50000", "50k", "50rb"           → 50000
    "100.000", "100k", "100rb"                 → 100000
    "1jt", "1.000.000", "1 juta"               → 1000000
  Then map per-person budget to tier:
    ≤ 50000             → "$"
    50001–100000        → "$$"
    > 100000            → "$$$"
  Words: "murah", "budget" without number → "$"; "premium", "mewah" → "$$$". No amount → null.
- intent: short snake_case English label like "remote_work", "date_night", "family_dining",
  "group_meeting", "nearby_browse".

Examples:
Query: "cafe cozy buat kerja remote ada wifi outlet"
→ {"keywords":"cozy work","facilities":["Wifi","Cozy"],"purposeSlug":null,"priceRange":null,"intent":"remote_work"}

Query: "terdekat dari sini"
→ {"keywords":"","facilities":[],"purposeSlug":null,"priceRange":null,"intent":"nearby_browse"}

Query: "Cari restoran yang cocok buat keluarga dengan budget 50.000"
→ {"keywords":"","facilities":[],"purposeSlug":null,"priceRange":"$","intent":"family_dining"}

Query: "kafe premium dengan budget 200rb"
→ {"keywords":"","facilities":[],"purposeSlug":null,"priceRange":"$$$","intent":"premium_dining"}

Output ONLY the JSON object, nothing else.`;
  }

  private parseJsonOutput(raw: string): Record<string, unknown> | null {
    const cleaned = raw
      .replace(/```[a-z]*\n?/g, '')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  private filterFacilities(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[])
      .filter(
        (f): f is string =>
          typeof f === 'string' && this.allowedFacilitySet.has(f),
      )
      .slice(0, 10);
  }

  private filterPurposeSlug(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    return this.purposeSlugs.includes(raw) ? raw : null;
  }

  private filterPriceRange(raw: unknown): '$' | '$$' | '$$$' | null {
    if (raw === '$' || raw === '$$' || raw === '$$$') return raw;
    return null;
  }
}
