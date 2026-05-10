import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard';
import { Public } from '../common/decorators/public.decorator';
import { PurposesService } from './purposes.service';
import { SyncPurposesDto } from './dto/sync-purposes.dto';

/**
 * Admin endpoints for purposes (vibes) — auth via ADMIN_API_KEY.
 */
@Controller('admin/purposes')
@Public()
@UseGuards(AdminApiKeyGuard)
export class PurposesAdminController {
  constructor(private readonly purposesService: PurposesService) {}

  /**
   * Idempotent upsert of purposes and their requirements.
   * Existing purpose (by slug) → updated; missing → created.
   * For every purpose, all requirements are replaced (delete + insert).
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync(@Body() dto: SyncPurposesDto) {
    return this.purposesService.syncPurposes({ purposes: dto.purposes });
  }

  @Post('backfill-tags')
  @HttpCode(HttpStatus.OK)
  async backfill() {
    return this.purposesService.backfillPurposeTags();
  }
}
