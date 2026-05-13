import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { CafeHit } from '../meili/meili-cafes.service';
import { ParsedQuery } from './dto/semantic-search.dto';

export interface CacheEntry {
  parsed: ParsedQuery | null;
  hits: CafeHit[];
}

@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);
  private readonly ttlSeconds: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.ttlSeconds = config.get<number>('SEMANTIC_CACHE_TTL_SECONDS', 3600);
  }

  buildHash(query: string, lat?: number, lng?: number, radius?: number): { hash: string; geoBucket: string } {
    const geoBucket =
      lat != null && lng != null
        ? `${(Math.round(lat * 100) / 100).toFixed(2)},${(Math.round(lng * 100) / 100).toFixed(2)},${radius ?? 2000}`
        : 'global';
    const hash = createHash('sha256')
      .update(`${query.toLowerCase().trim()}|${geoBucket}`)
      .digest('hex');
    return { hash, geoBucket };
  }

  async get(hash: string, geoBucket: string): Promise<CacheEntry | null> {
    try {
      const rows = await this.dataSource.query<
        { parsed_json: string | null; hit_ids_json: string | null }[]
      >(
        `SELECT parsed_json, hit_ids_json FROM search_query_cache
         WHERE query_hash = ? AND geo_bucket = ? AND expires_at > NOW()
         LIMIT 1`,
        [hash, geoBucket],
      );
      if (!rows.length) return null;

      // MySQL JSON columns are auto-parsed by the driver — handle both string and object
      const parsed = rows[0].parsed_json ? this.fromJson(rows[0].parsed_json) as ParsedQuery : null;
      const hits = rows[0].hit_ids_json ? this.fromJson(rows[0].hit_ids_json) as CafeHit[] : [];

      this.logger.debug(`Cache HIT hash=${hash.slice(0, 8)}... bucket=${geoBucket}`);
      return { parsed, hits };
    } catch (err) {
      this.logger.warn(`Cache read failed: ${String(err)}`);
      return null;
    }
  }

  private fromJson(value: unknown): unknown {
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return null; }
    }
    return value; // already parsed by MySQL driver
  }

  async set(
    hash: string,
    geoBucket: string,
    parsed: ParsedQuery | null,
    hits: CafeHit[],
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000)
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19);

      await this.dataSource.query(
        `INSERT INTO search_query_cache (query_hash, geo_bucket, parsed_json, hit_ids_json, expires_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           parsed_json = VALUES(parsed_json),
           hit_ids_json = VALUES(hit_ids_json),
           expires_at = VALUES(expires_at)`,
        [hash, geoBucket, JSON.stringify(parsed), JSON.stringify(hits), expiresAt],
      );
      this.logger.debug(`Cache SET hash=${hash.slice(0, 8)}... expires=${expiresAt}`);
    } catch (err) {
      this.logger.warn(`Cache write failed: ${String(err)}`);
    }
  }
}
