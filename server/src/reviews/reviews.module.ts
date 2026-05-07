import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { ReviewRating } from './entities/review-rating.entity';
import { ReviewMedia } from './entities/review-media.entity';
import { AchievementsModule } from '../achievements/achievements.module';
import { MeiliModule } from '../meili/meili.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ReviewRating, ReviewMedia]),
    AchievementsModule,
    MeiliModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
