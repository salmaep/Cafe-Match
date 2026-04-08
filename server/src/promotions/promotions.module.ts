import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { AdvertisementPackage } from './entities/advertisement-package.entity';
import { PromotionSlot } from './entities/promotion-slot.entity';
import { Cafe } from '../cafes/entities/cafe.entity';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Promotion, AdvertisementPackage, PromotionSlot, Cafe]),
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
