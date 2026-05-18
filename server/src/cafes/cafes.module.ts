import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cafe } from './entities/cafe.entity';
import { CafeFeature } from './entities/cafe-feature.entity';
import { Feature } from './entities/feature.entity';
import { PurposeRequirement } from '../purposes/entities/purpose-requirement.entity';
import { CafeGoogleReview } from '../scraper-sync/entities/cafe-google-review.entity';
import { CafesController } from './cafes.controller';
import { CafesService } from './cafes.service';
import { MeiliModule } from '../meili/meili.module';
import { SemanticSearchModule } from '../semantic-search/semantic-search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cafe,
      CafeFeature,
      Feature,
      PurposeRequirement,
      CafeGoogleReview,
    ]),
    MeiliModule,
    SemanticSearchModule,
  ],
  controllers: [CafesController],
  providers: [CafesService],
  exports: [CafesService],
})
export class CafesModule {}
