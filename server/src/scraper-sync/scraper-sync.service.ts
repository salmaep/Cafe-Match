import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { SyncCafeDto } from './dto/sync-cafe.dto';
import { parseOpeningHours } from './parsers/opening-hours.parser';
import {
  parseFeatures,
  parsePayment,
  ParsedFacility,
  DerivedFlags,
} from './parsers/features.parser';
import { parsePriceRange } from './parsers/pricing.parser';
import { MeiliCafesService } from '../meili/meili-cafes.service';
import { buildCafeSlug } from '../common/utils/slug.util';

export interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  errors: { googlePlaceId: string; reason: string }[];
}

@Injectable()
export class ScraperSyncService {
  private readonly logger = new Logger(ScraperSyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly meiliCafes: MeiliCafesService,
  ) {}

  async syncCafes(cafes: SyncCafeDto[]): Promise<SyncResult> {
    const result: SyncResult = { processed: 0, created: 0, updated: 0, errors: [] };
    const upsertedIds: number[] = [];

    for (const cafe of cafes) {
      try {
        const cafeId = await this.upsertCafe(cafe, result);
        if (cafeId) upsertedIds.push(cafeId);
        result.processed++;
      } catch (err: any) {
        this.logger.error(`Error syncing ${cafe.googlePlaceId}: ${err.message}`);
        result.errors.push({ googlePlaceId: cafe.googlePlaceId, reason: err.message });
      }
    }

    // Bulk-index to Meilisearch (fail-open — sync errors logged to retry queue)
    if (this.config.get('MEILI_SYNC_ENABLED') !== 'false' && upsertedIds.length > 0) {
      try {
        await this.meiliCafes.indexCafes(upsertedIds);
      } catch (err) {
        this.logger.error('Meili bulk-index failed after scraper-sync batch', err);
        for (const id of upsertedIds) {
          await this.meiliCafes.queueFailure(id, 'index', String(err));
        }
      }
    }

    return result;
  }

  private async upsertCafe(dto: SyncCafeDto, result: SyncResult): Promise<number | null> {
    const [lng, lat] = dto.location;
    const openingHours = parseOpeningHours(dto.openingHours);
    const priceRange = parsePriceRange(dto.pricing);
    const isActive = dto.status === 'active';

    // Parse once — child rows + boolean columns share the same source.
    const parsedFeatures = parseFeatures(dto.features ?? []);
    const paymentFacilities = parsePayment(dto.payment as Record<string, unknown> | null);
    const allFacilities = [...parsedFeatures.facilities, ...paymentFacilities];

    // Boolean flags: OR-merge DTO explicit field with parsed-from-features.
    // For has_mushola the DTO has no field, so it relies entirely on parsing.
    const flags: DerivedFlags = {
      wifiAvailable: !!dto.wifiAvailable || parsedFeatures.derivedFlags.wifiAvailable,
      hasParking: !!dto.hasParking || parsedFeatures.derivedFlags.hasParking,
      hasMushola: parsedFeatures.derivedFlags.hasMushola,
    };

    // Idempotency: lookup by google_place_id (UNIQUE in scraper context).
    // Existing row → UPDATE + replace child rows (no append, no duplicate).
    // Missing row → INSERT new.
    const [existing] = await this.dataSource.query(
      `SELECT id FROM cafes WHERE google_place_id = ? LIMIT 1`,
      [dto.googlePlaceId],
    );

    if (existing) {
      await this.updateCafe(
        existing.id, dto, lat, lng, openingHours, priceRange, isActive, flags,
      );
      result.updated++;
      await this.replaceGooglePhotos(existing.id, dto);
      await this.replaceFacilities(existing.id, allFacilities);
      await this.upsertGoogleReviews(existing.id, dto);
      return existing.id;
    } else {
      const cafeId = await this.insertCafe(
        dto, lat, lng, openingHours, priceRange, isActive, flags,
      );
      await Promise.all([
        this.replaceGooglePhotos(cafeId, dto),
        this.replaceFacilities(cafeId, allFacilities),
        this.upsertGoogleReviews(cafeId, dto),
      ]);
      result.created++;
      return cafeId;
    }
  }

  private async insertCafe(
    dto: SyncCafeDto,
    lat: number,
    lng: number,
    openingHours: Record<string, string> | null,
    priceRange: string,
    isActive: boolean,
    flags: DerivedFlags,
  ): Promise<number> {
    const result: any = await this.dataSource.query(
      `INSERT INTO cafes (
        name, slug, description, address, latitude, longitude,
        location, phone, google_place_id, google_maps_url, website,
        wifi_available, has_parking, has_mushola, opening_hours, price_range, pricing_raw,
        google_rating, total_google_reviews, is_active,
        category, city, district, claimed_by_owner, reviews_distribution,
        last_scraped_at, scraper_source
      ) VALUES (
        ?, NULL, ?, ?, ?, ?,
        ST_PointFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326), ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
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
        flags.wifiAvailable ? 1 : 0,
        flags.hasParking ? 1 : 0,
        flags.hasMushola ? 1 : 0,
        openingHours ? JSON.stringify(openingHours) : null,
        priceRange,
        dto.pricing ?? null,
        dto.rating ?? null,
        dto.totalReviews ?? null,
        isActive ? 1 : 0,
        dto.category ?? null,
        dto.city ?? null,
        dto.district ?? null,
        dto.claimed ? 1 : 0,
        dto.reviewsDistribution ? JSON.stringify(dto.reviewsDistribution) : null,
      ],
    );

    const cafeId: number = result.insertId;
    const slug = buildCafeSlug(dto.name.trim(), cafeId);
    await this.dataSource.query(`UPDATE cafes SET slug = ? WHERE id = ?`, [slug, cafeId]);

    return cafeId;
  }

  private async updateCafe(
    cafeId: number,
    dto: SyncCafeDto,
    lat: number,
    lng: number,
    openingHours: Record<string, string> | null,
    priceRange: string,
    isActive: boolean,
    flags: DerivedFlags,
  ): Promise<void> {
    // Smart merge: do NOT overwrite owner_id, bookmarks_count, favorites_count,
    // has_active_promotion, active_promotion_type, promotion_content, new_cafe_content.
    // For boolean flags (wifi_available, has_parking, has_mushola): OR-merge —
    // never downgrade an admin-set TRUE to FALSE just because the scraper missed it.
    const slug = buildCafeSlug(dto.name.trim(), cafeId);

    await this.dataSource.query(
      `UPDATE cafes SET
        name=?, slug=?, address=?, phone=?, description=?,
        latitude=?, longitude=?,
        location=ST_PointFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326),
        opening_hours=?, google_maps_url=?, website=?,
        google_rating=?, total_google_reviews=?,
        wifi_available = (wifi_available OR ?),
        has_parking    = (has_parking    OR ?),
        has_mushola    = (has_mushola    OR ?),
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
        openingHours ? JSON.stringify(openingHours) : null,
        dto.urlGoogleMaps ?? null,
        dto.website ?? null,
        dto.rating ?? null,
        dto.totalReviews ?? null,
        flags.wifiAvailable ? 1 : 0,
        flags.hasParking ? 1 : 0,
        flags.hasMushola ? 1 : 0,
        priceRange,
        dto.pricing ?? null,
        isActive ? 1 : 0,
        dto.category ?? null,
        dto.city ?? null,
        dto.district ?? null,
        dto.claimed ? 1 : 0,
        dto.reviewsDistribution ? JSON.stringify(dto.reviewsDistribution) : null,
        cafeId,
      ],
    );
  }

  private async replaceGooglePhotos(cafeId: number, dto: SyncCafeDto): Promise<void> {
    // Remove existing google-sourced photos (preserve source='manual')
    await this.dataSource.query(
      `DELETE FROM cafe_photos WHERE cafe_id = ? AND source = 'google'`,
      [cafeId],
    );

    const photos: { url: string; isPrimary: boolean; order: number; caption?: string }[] = [];

    if (dto.coverImage) {
      photos.push({ url: dto.coverImage, isPrimary: true, order: 0 });
    }

    let order = dto.coverImage ? 1 : 0;
    for (const url of dto.gallery ?? []) {
      if (url === dto.coverImage) continue;
      photos.push({ url, isPrimary: false, order: order++ });
    }

    for (const url of dto.menu?.photos ?? []) {
      photos.push({ url, isPrimary: false, order: order++, caption: 'menu_photo' });
    }

    for (const p of photos) {
      await this.dataSource.query(
        `INSERT INTO cafe_photos (cafe_id, url, source, display_order, is_primary, caption)
         VALUES (?, ?, 'google', ?, ?, ?)`,
        [cafeId, p.url, p.order, p.isPrimary ? 1 : 0, p.caption ?? null],
      );
    }
  }

  private async replaceFacilities(
    cafeId: number,
    facilities: ParsedFacility[],
  ): Promise<void> {
    // Idempotent: wipe then re-insert. UNIQUE(cafe_id, facility_key) protects
    // against concurrent duplicates if this ever runs in parallel.
    await this.dataSource.query(`DELETE FROM cafe_facilities WHERE cafe_id = ?`, [cafeId]);

    const seen = new Set<string>();
    for (const fac of facilities) {
      if (seen.has(fac.facilityKey)) continue;
      seen.add(fac.facilityKey);
      await this.dataSource.query(
        `INSERT INTO cafe_facilities (cafe_id, facility_key, facility_value) VALUES (?, ?, ?)`,
        [cafeId, fac.facilityKey, fac.facilityValue ?? null],
      ).catch(() => {});
    }
  }

  private async upsertGoogleReviews(cafeId: number, dto: SyncCafeDto): Promise<void> {
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
