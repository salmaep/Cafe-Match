import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cafe } from '../cafes/entities/cafe.entity';
import { CafePhoto } from '../photos/entities/cafe-photo.entity';
import { CafeFeature } from '../cafes/entities/cafe-feature.entity';
import { Feature } from '../cafes/entities/feature.entity';
import { Purpose } from '../purposes/entities/purpose.entity';
import { PurposeRequirement } from '../purposes/entities/purpose-requirement.entity';
import { CafeMenu } from '../menus/entities/cafe-menu.entity';
import { CafeGoogleReview } from './entities/cafe-google-review.entity';
import { ScraperSyncController } from './scraper-sync.controller';
import { ScraperSyncService } from './scraper-sync.service';
import { MeiliModule } from '../meili/meili.module';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cafe,
      CafePhoto,
      CafeFeature,
      Feature,
      CafeMenu,
      CafeGoogleReview,
      Purpose,
      PurposeRequirement,
    ]),
    MeiliModule,
  ],
  controllers: [ScraperSyncController],
  providers: [ScraperSyncService, AdminApiKeyGuard],
})
export class ScraperSyncModule {}
