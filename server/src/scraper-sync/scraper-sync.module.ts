import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cafe } from '../cafes/entities/cafe.entity';
import { CafePhoto } from '../photos/entities/cafe-photo.entity';
import { CafeFacility } from '../cafes/entities/cafe-facility.entity';
import { CafeMenu } from '../menus/entities/cafe-menu.entity';
import { CafeGoogleReview } from './entities/cafe-google-review.entity';
import { ScraperSyncController } from './scraper-sync.controller';
import { ScraperSyncService } from './scraper-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cafe, CafePhoto, CafeFacility, CafeMenu, CafeGoogleReview]),
  ],
  controllers: [ScraperSyncController],
  providers: [ScraperSyncService],
})
export class ScraperSyncModule {}
