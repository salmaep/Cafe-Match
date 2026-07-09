import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SyncCafeDto } from './dto/sync-cafe.dto';
import {
  parseAndValidate,
  SyncPhotoKind,
} from './dto/sync-cafe-photos.dto';
import { MeiliCafesService } from '../meili/meili-cafes.service';
import { buildCafeSlug } from '../common/utils/slug.util';

const CAFE_PHOTOS_DIR = join(process.cwd(), 'storage', 'cafe-photos');
// The prod app_storage volume predates this dir — create it at module load
// (same pattern as uploads.controller.ts).
if (!existsSync(CAFE_PHOTOS_DIR)) mkdirSync(CAFE_PHOTOS_DIR, { recursive: true });

export interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  errors: { googlePlaceId: string; reason: string }[];
}

/**
 * Pure inserter: stores incoming cafe data exactly as supplied by the
 * pre-processor frontend. No parsing, no alias mapping, no derived flags.
 *
 * Idempotency: lookup by `google_place_id`. Existing rows are UPDATEd and
 * child rows (features/photos/google reviews) are replaced (delete + insert)
 * so payload remains the source of truth for that source.
 */
@Injectable()
export class ScraperSyncService {
  private readonly logger = new Logger(ScraperSyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly meiliCafes: MeiliCafesService,
  ) {}

  async syncCafes(cafes: SyncCafeDto[]): Promise<SyncResult> {
    const result: SyncResult = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [],
    };
    const upsertedIds: number[] = [];

    for (const cafe of cafes) {
      try {
        const cafeId = await this.upsertCafe(cafe, result);
        if (cafeId) upsertedIds.push(cafeId);
        result.processed++;
      } catch (err: any) {
        this.logger.error(
          `Error syncing ${cafe.googlePlaceId}: ${err.message}`,
        );
        result.errors.push({
          googlePlaceId: cafe.googlePlaceId,
          reason: err.message,
        });
      }
    }

    // Bulk-index to Meilisearch (fail-open — sync errors logged to retry queue)
    if (
      this.config.get('MEILI_SYNC_ENABLED') !== 'false' &&
      upsertedIds.length > 0
    ) {
      try {
        await this.meiliCafes.indexCafes(upsertedIds);
      } catch (err) {
        this.logger.error(
          'Meili bulk-index failed after scraper-sync batch',
          err,
        );
        for (const id of upsertedIds) {
          await this.meiliCafes.queueFailure(id, 'index', String(err));
        }
      }
    }

    return result;
  }

  /**
   * Receives an authoritative photo snapshot (bytes included) from the
   * scraper and self-hosts it: files land in storage/cafe-photos (served at
   * /api/v1/storage/cafe-photos), rows replace the cafe's google-sourced
   * photos. Idempotent — re-pushing the same snapshot converges.
   */
  async syncCafePhotos(
    payloadRaw: unknown,
    files: Express.Multer.File[],
  ): Promise<
    | { status: 'unknown_cafe' }
    | { status: 'ok'; cafeId: number; photos: Record<string, string> }
  > {
    const payload = parseAndValidate(payloadRaw);

    // Rows imported by the old pipeline hold the 0x..:0x.. data-id format,
    // the scraper's canonical key is ChIJ... — accept either.
    const ids = [payload.googlePlaceId, ...payload.altIds];
    const [cafe] = await this.dataSource.query(
      `SELECT id FROM cafes WHERE google_place_id IN (${ids.map(() => '?').join(',')}) LIMIT 1`,
      ids,
    );
    if (!cafe) return { status: 'unknown_cafe' };
    const cafeId: number = cafe.id;

    const fileByField = new Map<string, Express.Multer.File>();
    for (const f of files) fileByField.set(f.fieldname, f);

    // All-or-nothing: the scraper retries with a complete snapshot, so a
    // missing part means a malformed push, not a partial update.
    for (const photo of payload.photos) {
      if (!fileByField.has(photo.id)) {
        throw new BadRequestException(`missing file part for photo ${photo.id}`);
      }
    }

    const urls: Record<string, string> = {};
    const rows: {
      url: string;
      kind: SyncPhotoKind;
      ref: string;
      caption: string | null;
      order: number;
    }[] = [];
    for (const photo of payload.photos) {
      const file = fileByField.get(photo.id)!;
      const ext = extForMime(photo.contentType || file.mimetype);
      const filename = `${photo.id}${ext}`;
      const path = join(CAFE_PHOTOS_DIR, filename);
      // Ids are content-stable (derived from the Google photo token), so an
      // existing file is the same image — skip the write on re-push.
      if (!existsSync(path)) {
        await writeFile(path, file.buffer);
      }
      const url = this.publicStorageUrl('cafe-photos', filename);
      urls[photo.id] = url;
      rows.push({
        url,
        kind: photo.kind,
        ref: photo.id,
        caption: photo.caption ?? null,
        order: photo.order,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM cafe_photos WHERE cafe_id = ? AND source = 'google'`,
        [cafeId],
      );
      for (const row of rows) {
        await manager.query(
          `INSERT INTO cafe_photos
             (cafe_id, url, source, photo_type, google_photo_ref, caption, display_order, is_primary)
           VALUES (?, ?, 'google', ?, ?, ?, ?, ?)`,
          [
            cafeId,
            row.url,
            row.kind,
            row.ref,
            row.caption,
            row.order,
            row.kind === 'cover' ? 1 : 0,
          ],
        );
      }
    });

    // Photos flow into search documents — reindex fail-open like syncCafes.
    if (this.config.get('MEILI_SYNC_ENABLED') !== 'false') {
      try {
        await this.meiliCafes.indexCafes([cafeId]);
      } catch (err) {
        this.logger.error(
          `Meili index failed after photo sync for cafe ${cafeId}`,
          err,
        );
        await this.meiliCafes.queueFailure(cafeId, 'index', String(err));
      }
    }

    return { status: 'ok', cafeId, photos: urls };
  }

  private publicStorageUrl(folder: string, filename: string): string {
    const publicBase =
      this.config.get<string>('PUBLIC_API_URL') ??
      'http://localhost:3000/api/v1';
    return `${publicBase.replace(/\/$/, '')}/storage/${folder}/${filename}`;
  }

  private async upsertCafe(
    dto: SyncCafeDto,
    result: SyncResult,
  ): Promise<number | null> {
    const [lng, lat] = dto.location;
    const isActive = dto.status === 'active';

    const [existing] = await this.dataSource.query(
      `SELECT id FROM cafes WHERE google_place_id = ? LIMIT 1`,
      [dto.googlePlaceId],
    );

    if (existing) {
      await this.updateCafe(existing.id, dto, lat, lng, isActive);
      result.updated++;
      await this.replaceGooglePhotos(existing.id, dto);
      await this.replaceFeatures(existing.id, dto);
      await this.replacePurposeScores(existing.id, dto);
      await this.upsertGoogleReviews(existing.id, dto);
      return existing.id;
    } else {
      const cafeId = await this.insertCafe(dto, lat, lng, isActive);
      await this.replaceGooglePhotos(cafeId, dto);
      await this.replaceFeatures(cafeId, dto);
      await this.replacePurposeScores(cafeId, dto);
      await this.upsertGoogleReviews(cafeId, dto);
      result.created++;
      return cafeId;
    }
  }

  private async insertCafe(
    dto: SyncCafeDto,
    lat: number,
    lng: number,
    isActive: boolean,
  ): Promise<number> {
    const result: any = await this.dataSource.query(
      `INSERT INTO cafes (
        name, slug, description, address, latitude, longitude,
        location, phone, google_place_id, google_maps_url, website,
        opening_hours, price_range, pricing_raw,
        google_rating, total_google_reviews, is_active,
        category, city, district, claimed_by_owner, reviews_distribution,
        last_scraped_at, scraper_source
      ) VALUES (
        ?, NULL, ?, ?, ?, ?,
        ST_PointFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326), ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        NOW(), 'google_scraper'
      )`,
      [
        dto.name.trim(),
        dto.description ?? null,
        dto.address.trim(),
        lat,
        lng,
        lat,
        lng,
        dto.phone?.trim() ?? null,
        dto.googlePlaceId,
        dto.urlGoogleMaps ?? null,
        dto.website ?? null,
        dto.openingHours ? JSON.stringify(dto.openingHours) : null,
        dto.priceRange ?? '$$',
        dto.pricingRaw ?? null,
        dto.rating ?? null,
        dto.totalReviews ?? null,
        isActive ? 1 : 0,
        dto.category ?? null,
        dto.city ?? null,
        dto.district ?? null,
        dto.claimed ? 1 : 0,
        dto.reviewsDistribution
          ? JSON.stringify(dto.reviewsDistribution)
          : null,
      ],
    );

    const cafeId: number = result.insertId;
    const slug = buildCafeSlug(dto.name.trim(), cafeId);
    await this.dataSource.query(`UPDATE cafes SET slug = ? WHERE id = ?`, [
      slug,
      cafeId,
    ]);

    return cafeId;
  }

  private async updateCafe(
    cafeId: number,
    dto: SyncCafeDto,
    lat: number,
    lng: number,
    isActive: boolean,
  ): Promise<void> {
    // Smart merge: do NOT overwrite owner_id, bookmarks_count, favorites_count,
    // has_active_promotion, active_promotion_type, promotion_content, new_cafe_content.
    const slug = buildCafeSlug(dto.name.trim(), cafeId);

    await this.dataSource.query(
      `UPDATE cafes SET
        name=?, slug=?, address=?, phone=?, description=?,
        latitude=?, longitude=?,
        location=ST_PointFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326),
        opening_hours=?, google_maps_url=?, website=?,
        google_rating=?, total_google_reviews=?,
        price_range=?, pricing_raw=?, is_active=?,
        category=?, city=?, district=?,
        claimed_by_owner=?, reviews_distribution=?,
        last_scraped_at=NOW(), scraper_source='google_scraper'
      WHERE id=?`,
      [
        dto.name.trim(),
        slug,
        dto.address.trim(),
        dto.phone?.trim() ?? null,
        dto.description ?? null,
        lat,
        lng,
        lat,
        lng,
        dto.openingHours ? JSON.stringify(dto.openingHours) : null,
        dto.urlGoogleMaps ?? null,
        dto.website ?? null,
        dto.rating ?? null,
        dto.totalReviews ?? null,
        dto.priceRange ?? '$$',
        dto.pricingRaw ?? null,
        isActive ? 1 : 0,
        dto.category ?? null,
        dto.city ?? null,
        dto.district ?? null,
        dto.claimed ? 1 : 0,
        dto.reviewsDistribution
          ? JSON.stringify(dto.reviewsDistribution)
          : null,
        cafeId,
      ],
    );
  }

  private async replaceFeatures(
    cafeId: number,
    dto: SyncCafeDto,
  ): Promise<void> {
    // Wipe only google_scraper-sourced rows; preserve manual entries (owner edits).
    await this.dataSource.query(
      `DELETE FROM cafe_features WHERE cafe_id = ? AND source = 'google_scraper'`,
      [cafeId],
    );

    const seen = new Set<string>();
    for (const feature of dto.features ?? []) {
      const name = feature.name.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);

      // Upsert master features table — first time seen, INSERT new row.
      // ON DUPLICATE KEY = same name already exists → return its id.
      // We use LAST_INSERT_ID() trick to get the id of the matched row.
      await this.dataSource.query(
        `INSERT INTO features (name, category) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [name, feature.category ?? null],
      );
      const [{ id: featureId }] = await this.dataSource.query(
        `SELECT id FROM features WHERE name = ? LIMIT 1`,
        [name],
      );

      // Insert junction row.
      await this.dataSource.query(
        `INSERT INTO cafe_features (cafe_id, feature_id, source) VALUES (?, ?, 'google_scraper')
         ON DUPLICATE KEY UPDATE source = 'google_scraper'`,
        [cafeId, featureId],
      );
    }
  }

  /**
   * Replace cafe_purpose_tags for one cafe based on AI-supplied scores.
   * Each entry must reference an existing purpose by slug. Score < 1 is
   * skipped. Score > 100 is clamped.
   */
  private async replacePurposeScores(
    cafeId: number,
    dto: SyncCafeDto,
  ): Promise<void> {
    if (!dto.purposeScores || dto.purposeScores.length === 0) return;

    await this.dataSource.query(
      `DELETE FROM cafe_purpose_tags WHERE cafe_id = ?`,
      [cafeId],
    );

    for (const ps of dto.purposeScores) {
      const slug = ps.slug?.trim();
      const score = Math.max(0, Math.min(100, Math.round(ps.score)));
      if (!slug || score < 1) continue;

      // Best-effort: skip silently if slug not registered.
      const [purposeRow] = await this.dataSource.query(
        `SELECT id FROM purposes WHERE slug = ? LIMIT 1`,
        [slug],
      );
      if (!purposeRow) {
        this.logger.warn(
          `Unknown purpose slug "${slug}" for cafe ${cafeId} — skipped`,
        );
        continue;
      }

      await this.dataSource.query(
        `INSERT INTO cafe_purpose_tags (cafe_id, purpose_slug, score) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE score = VALUES(score)`,
        [cafeId, slug, score],
      );
    }
  }

  private async replaceGooglePhotos(
    cafeId: number,
    dto: SyncCafeDto,
  ): Promise<void> {
    // Self-hosted photos (google_photo_ref set, pushed by the scraper with
    // actual bytes) are authoritative — the pre-processor only carries
    // expiring googleusercontent URLs, which would be a downgrade. The
    // scraper re-pushes automatically after every rescrape.
    const [selfHosted] = await this.dataSource.query(
      `SELECT id FROM cafe_photos
       WHERE cafe_id = ? AND source = 'google' AND google_photo_ref IS NOT NULL
       LIMIT 1`,
      [cafeId],
    );
    if (selfHosted) return;

    // Remove existing google-sourced photos (preserve source='manual')
    await this.dataSource.query(
      `DELETE FROM cafe_photos WHERE cafe_id = ? AND source = 'google'`,
      [cafeId],
    );

    let order = 0;

    if (dto.coverImage) {
      await this.insertGooglePhoto(
        cafeId,
        dto.coverImage,
        'cover',
        order++,
        true,
      );
    }

    for (const url of dto.gallery ?? []) {
      if (url === dto.coverImage) continue;
      await this.insertGooglePhoto(cafeId, url, 'gallery', order++, false);
    }

    for (const url of dto.menu?.photos ?? []) {
      await this.insertGooglePhoto(cafeId, url, 'menu', order++, false);
    }
  }

  private async insertGooglePhoto(
    cafeId: number,
    url: string,
    photoType: 'cover' | 'gallery' | 'menu',
    displayOrder: number,
    isPrimary: boolean,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO cafe_photos (cafe_id, url, source, photo_type, display_order, is_primary)
       VALUES (?, ?, 'google', ?, ?, ?)`,
      [cafeId, url, photoType, displayOrder, isPrimary ? 1 : 0],
    );
  }

  private async upsertGoogleReviews(
    cafeId: number,
    dto: SyncCafeDto,
  ): Promise<void> {
    for (const review of dto.reviews ?? []) {
      const hash = crypto
        .createHash('sha256')
        .update(`${cafeId}:${review.guest?.name ?? ''}:${review.comment ?? ''}`)
        .digest('hex');

      await this.dataSource.query(
        `INSERT INTO cafe_google_reviews (cafe_id, guest_name, guest_avatar, rating, comment, photo_url, external_hash, scraped_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           guest_name=VALUES(guest_name),
           rating=VALUES(rating),
           comment=VALUES(comment),
           photo_url=VALUES(photo_url),
           scraped_at=NOW()`,
        [
          cafeId,
          review.guest?.name?.trim() ?? 'Anonymous',
          review.guest?.image ?? null,
          review.rating,
          review.comment ?? null,
          review.photoUrl ?? null,
          hash,
        ],
      );
    }
  }
}

function extForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.jpg';
  }
}
