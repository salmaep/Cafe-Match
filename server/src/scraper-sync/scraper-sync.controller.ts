import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ScraperApiKeyGuard } from '../common/guards/scraper-api-key.guard';
import { Public } from '../common/decorators/public.decorator';
import { ScraperSyncService } from './scraper-sync.service';
import { SyncCafesBatchDto } from './dto/sync-cafes-batch.dto';

@Public()
@UseGuards(ScraperApiKeyGuard)
@Controller('sync')
export class ScraperSyncController {
  constructor(private readonly syncService: ScraperSyncService) {}

  @Post('cafes')
  @HttpCode(HttpStatus.OK)
  async syncCafes(@Body() body: SyncCafesBatchDto) {
    return this.syncService.syncCafes(body.cafes);
  }

  // Multipart: one 'payload' JSON text field + one file part per photo whose
  // field name is the scraper's image id (dynamic → AnyFilesInterceptor).
  // Payloads are small (~20 photos × ~100KB), so memoryStorage is fine.
  @Post('cafe-photos')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: { files: 40, fileSize: 5 * 1024 * 1024 },
    }),
  )
  async syncCafePhotos(
    @Body('payload') payload: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.syncService.syncCafePhotos(payload, files ?? []);
  }
}
