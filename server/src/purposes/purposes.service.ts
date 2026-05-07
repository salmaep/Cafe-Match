import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Purpose } from './entities/purpose.entity';
import { PurposeRequirement } from './entities/purpose-requirement.entity';

interface PurposeMatcher {
  id: number;
  slug: string;
  name: string;
  requirements: { facilityKey: string; isMandatory: boolean; weight: number }[];
  maxScore: number;
}

@Injectable()
export class PurposesService {
  private readonly logger = new Logger(PurposesService.name);

  constructor(
    @InjectRepository(Purpose)
    private readonly purposesRepository: Repository<Purpose>,
    @InjectRepository(PurposeRequirement)
    private readonly requirementsRepository: Repository<PurposeRequirement>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    return this.purposesRepository.find({
      relations: ['requirements'],
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Backfill `cafe_purpose_tags` for every cafe × purpose combination.
   *
   * Reads each cafe's facility list (cafe_facilities + boolean columns), runs
   * the same scoring rules used by `cafes.service.computePurposesAndScore()`,
   * and upserts a row in `cafe_purpose_tags` per (cafe, purpose) where score > 0
   * AND mandatory requirements are met.
   *
   * Idempotent — uses ON DUPLICATE KEY UPDATE with GREATEST() so existing higher
   * scores (e.g. from review aggregation) are preserved.
   */
  async backfillPurposeTags(): Promise<{
    cafesProcessed: number;
    tagsWritten: number;
  }> {
    const matchers = await this.loadMatchers();
    if (matchers.length === 0) {
      this.logger.warn('No purposes/requirements found — nothing to backfill.');
      return { cafesProcessed: 0, tagsWritten: 0 };
    }

    const cafes: { id: number }[] = await this.dataSource.query(
      `SELECT id FROM cafes WHERE deleted_at IS NULL AND is_active = TRUE`,
    );

    let tagsWritten = 0;
    for (const cafe of cafes) {
      const facilityKeys = await this.loadCafeFacilityKeys(cafe.id);
      for (const matcher of matchers) {
        const score = this.scoreMatcher(facilityKeys, matcher);
        if (score <= 0) continue;
        await this.dataSource.query(
          `INSERT INTO cafe_purpose_tags (cafe_id, purpose_slug, score)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE score = GREATEST(score, VALUES(score))`,
          [cafe.id, matcher.slug, score],
        );
        tagsWritten++;
      }
    }

    this.logger.log(
      `Purpose backfill complete: ${cafes.length} cafes processed, ${tagsWritten} tags written.`,
    );
    return { cafesProcessed: cafes.length, tagsWritten };
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private async loadMatchers(): Promise<PurposeMatcher[]> {
    const purposes: { id: number; slug: string; name: string }[] =
      await this.dataSource.query(
        `SELECT id, slug, name FROM purposes ORDER BY display_order ASC`,
      );
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
    return purposes.map((p) => {
      const requirements = reqsByPurpose.get(p.id) || [];
      const maxScore = requirements.reduce((s, r) => s + r.weight, 0);
      return { id: p.id, slug: p.slug, name: p.name, requirements, maxScore };
    });
  }

  /**
   * All facility keys present for a cafe, including synthesized keys derived
   * from boolean columns (mirrors meili/cafe-to-document.ts behavior).
   */
  private async loadCafeFacilityKeys(cafeId: number): Promise<string[]> {
    const rows: { facility_key: string }[] = await this.dataSource.query(
      `SELECT facility_key FROM cafe_facilities WHERE cafe_id = ?`,
      [cafeId],
    );
    const keys = new Set(rows.map((r) => r.facility_key));

    const [flags] = await this.dataSource.query(
      `SELECT wifi_available, has_mushola, has_parking FROM cafes WHERE id = ?`,
      [cafeId],
    );
    if (flags) {
      if (flags.wifi_available) keys.add('strong_wifi');
      if (flags.has_mushola) keys.add('mushola');
      if (flags.has_parking) keys.add('parking');
    }
    return Array.from(keys);
  }

  private scoreMatcher(facilityKeys: string[], matcher: PurposeMatcher): number {
    const mandatoryKeys = matcher.requirements
      .filter((r) => r.isMandatory)
      .map((r) => r.facilityKey);
    const mandatoryMet = mandatoryKeys.every((k) => facilityKeys.includes(k));
    if (!mandatoryMet) return 0;

    const matchedWeight = matcher.requirements
      .filter((r) => facilityKeys.includes(r.facilityKey))
      .reduce((s, r) => s + r.weight, 0);

    if (matchedWeight === 0) return 0;
    return matcher.maxScore > 0
      ? Math.round((matchedWeight / matcher.maxScore) * 100)
      : 0;
  }
}
