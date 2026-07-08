import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TablesService } from './tables.service';

/**
 * Periodic sweep for the Open Table feature: expires tables past their
 * TABLE_MAX_DURATION_HOURS window plus their pending join requests.
 * Reads also lazy-expire, so this is a safety net that keeps the map pins
 * and lists honest even without traffic. (Pattern: users.cleanup.ts.)
 */
@Injectable()
export class TablesSweepService {
  constructor(private readonly tablesService: TablesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStaleTables(): Promise<void> {
    try {
      const expired = await this.tablesService.expireStale();
      if (expired > 0) {
        console.log(`[tables] sweep expired ${expired} table(s)`);
      }
    } catch (err: any) {
      console.warn('[tables] sweep failed:', err?.message);
    }
  }
}
