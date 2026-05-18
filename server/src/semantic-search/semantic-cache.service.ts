import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
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

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  buildHash(
    query: string,
    lat?: number,
    lng?: number,
    radius?: number,
  ): { hash: string; geoBucket: string } {
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
    const key = this.key(hash, geoBucket);
    try {
      const entry = await this.cache.get<CacheEntry>(key);
      if (entry) {
        this.logger.debug(
          `Cache HIT key=${hash.slice(0, 8)}... bucket=${geoBucket}`,
        );
        return entry;
      }
      return null;
    } catch (err) {
      this.logger.warn(`Cache read failed: ${String(err)}`);
      return null;
    }
  }

  async set(
    hash: string,
    geoBucket: string,
    parsed: ParsedQuery | null,
    hits: CafeHit[],
  ): Promise<void> {
    const key = this.key(hash, geoBucket);
    try {
      await this.cache.set(key, { parsed, hits });
      this.logger.debug(
        `Cache SET key=${hash.slice(0, 8)}... bucket=${geoBucket}`,
      );
    } catch (err) {
      this.logger.warn(`Cache write failed: ${String(err)}`);
    }
  }

  private key(hash: string, geoBucket: string): string {
    return `semantic:${hash}|${geoBucket}`;
  }
}
