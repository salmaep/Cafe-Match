import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Public } from '../common/decorators/public.decorator';
import { ScraperSyncService } from './scraper-sync.service';
import { SyncCafesBatchDto } from './dto/sync-cafes-batch.dto';

@Public()
@UseGuards(ApiKeyGuard)
@Controller('sync')
export class ScraperSyncController {
  constructor(private readonly syncService: ScraperSyncService) {}

  @Post('cafes')
  @HttpCode(HttpStatus.OK)
  async syncCafes(@Body() body: SyncCafesBatchDto) {
    return this.syncService.syncCafes(body.cafes);
  }
}
