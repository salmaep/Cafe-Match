import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Purpose } from './entities/purpose.entity';
import { PurposeRequirement } from './entities/purpose-requirement.entity';

interface PurposeMatcher {
  id: number;
  slug: string;
  name: string;
  requirements: { featureName: string; isMandatory: boolean; weight: number }[];
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
      relations: ['requirements', 'requirements.feature'],
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Idempotent batch sync of purposes + their requirements.
   *
   * For each input purpose:
   *   - Upsert by `slug`: insert new or update name/description/icon/displayOrder
   *   - Replace requirements: DELETE old + INSERT new (purpose_id, feature_name)
   *
   * Returns counts of inserted / updated purposes and total requirements written.
   */
  async syncPurposes(input: {
    purposes: {
      slug: string;
      name: string;
      description?: string;
      icon?: string;
      displayOrder?: number;
      requirements: { featureName: string; isMandatory?: boolean; weight?: number }[];
    }[];
  }): Promise<{ created: number; updated: number; requirementsWritten: number; skippedFeatures: string[] }> {
    let created = 0;
    let updated = 0;
    let requirementsWritten = 0;
    const skippedFeatures: string[] = [];

    await this.dataSource.transaction(async (manager) => {
      for (const p of input.purposes) {
        let purpose = await manager.findOne(Purpose, { where: { slug: p.slug } });
        if (purpose) {
          purpose.name = p.name;
          purpose.description = p.description ?? purpose.description;
          purpose.icon = p.icon ?? purpose.icon;
          if (p.displayOrder != null) purpose.displayOrder = p.displayOrder;
          await manager.save(purpose);
          updated++;
        } else {
          purpose = manager.create(Purpose, {
            slug: p.slug,
            name: p.name,
            description: p.description ?? '',
            icon: p.icon ?? '',
            displayOrder: p.displayOrder ?? 0,
          });
          purpose = await manager.save(purpose);
          created++;
        }

        // Replace all requirements for this purpose
        await manager.delete(PurposeRequirement, { purposeId: purpose.id });

        for (const req of p.requirements ?? []) {
          const featureName = req.featureName.trim();
          if (!featureName) continue;

          // Upsert master features (auto-create if missing — admins can later
          // edit/curate the entry).
          await manager.query(
            `INSERT INTO features (name, category) VALUES (?, NULL)
             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
            [featureName],
          );
          const [row] = await manager.query(
            `SELECT id FROM features WHERE name = ? LIMIT 1`,
            [featureName],
          );
          if (!row) {
            skippedFeatures.push(featureName);
            continue;
          }

          await manager.save(
            manager.create(PurposeRequirement, {
              purposeId: purpose.id,
              featureId: row.id,
              isMandatory: req.isMandatory ?? false,
              weight: req.weight ?? 1,
            }),
          );
          requirementsWritten++;
        }
      }
    });

    this.logger.log(
      `Purposes sync: created=${created}, updated=${updated}, reqs=${requirementsWritten}, skipped=${skippedFeatures.length}`,
    );
    return { created, updated, requirementsWritten, skippedFeatures };
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
      const featureNames = await this.loadCafeFacilityKeys(cafe.id);
      for (const matcher of matchers) {
        const score = this.scoreMatcher(featureNames, matcher);
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
    // Resolve feature names via JOIN — purpose_requirements.feature_id → features.name
    const reqs: {
      purposeId: number; featureName: string; isMandatory: number; weight: number;
    }[] = await this.dataSource.query(
      `SELECT pr.purpose_id AS purposeId, f.name AS featureName,
              pr.is_mandatory AS isMandatory, pr.weight AS weight
       FROM purpose_requirements pr
       JOIN features f ON f.id = pr.feature_id`,
    );
    const reqsByPurpose = new Map<
      number,
      { featureName: string; isMandatory: boolean; weight: number }[]
    >();
    for (const r of reqs) {
      if (!reqsByPurpose.has(r.purposeId)) reqsByPurpose.set(r.purposeId, []);
      reqsByPurpose.get(r.purposeId)!.push({
        featureName: r.featureName,
        isMandatory: !!r.isMandatory,
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
   * All feature names present for a cafe. Note: purpose_requirements.facility_key
   * must align with the new cafe_features.name strings — legacy canonical keys
   * (e.g. 'strong_wifi') won't match raw feature names (e.g. 'wifi gratis')
   * unless purpose_requirements is updated separately.
   */
  private async loadCafeFacilityKeys(cafeId: number): Promise<string[]> {
    const rows: { name: string }[] = await this.dataSource.query(
      `SELECT f.name FROM cafe_features cf
       JOIN features f ON f.id = cf.feature_id
       WHERE cf.cafe_id = ?`,
      [cafeId],
    );
    return rows.map((r) => r.name);
  }

  private scoreMatcher(featureNames: string[], matcher: PurposeMatcher): number {
    const mandatoryKeys = matcher.requirements
      .filter((r) => r.isMandatory)
      .map((r) => r.featureName);
    const mandatoryMet = mandatoryKeys.every((k) => featureNames.includes(k));
    if (!mandatoryMet) return 0;

    const matchedWeight = matcher.requirements
      .filter((r) => featureNames.includes(r.featureName))
      .reduce((s, r) => s + r.weight, 0);

    if (matchedWeight === 0) return 0;
    return matcher.maxScore > 0
      ? Math.round((matchedWeight / matcher.maxScore) * 100)
      : 0;
  }
}
