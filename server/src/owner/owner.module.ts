import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cafe } from '../cafes/entities/cafe.entity';
import { CafeMenu } from '../menus/entities/cafe-menu.entity';
import { CafePhoto } from '../photos/entities/cafe-photo.entity';
import { CafeFacility } from '../cafes/entities/cafe-facility.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { CafeAnalytics } from '../analytics/entities/cafe-analytics.entity';
import { OwnerController } from './owner.controller';
import { OwnerService } from './owner.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cafe,
      CafeMenu,
      CafePhoto,
      CafeFacility,
      Promotion,
      CafeAnalytics,
    ]),
  ],
  controllers: [OwnerController],
  providers: [OwnerService],
  exports: [OwnerService],
})
export class OwnerModule {}
