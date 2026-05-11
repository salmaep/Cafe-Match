import { Controller, Post, UseGuards } from '@nestjs/common';
import { MeiliCafesService } from '../meili/meili-cafes.service';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard';
import { Public } from '../common/decorators/public.decorator';

/**
 * Infrastructure endpoints — auth via static `ADMIN_API_KEY` (x-api-key header).
 * Separated from AdminController (JWT-protected) so they can be triggered by
 * scripts and automation without managing JWT tokens.
 */
@Controller('admin/meili')
@Public()
@UseGuards(AdminApiKeyGuard)
export class MeiliAdminController {
  constructor(private readonly meiliCafes: MeiliCafesService) {}

  @Post('reindex-all')
  reindexAll() {
    return this.meiliCafes.reindexAll();
  }

  @Post('resync-failed')
  resyncFailed() {
    return this.meiliCafes.resyncFailed();
  }
}
