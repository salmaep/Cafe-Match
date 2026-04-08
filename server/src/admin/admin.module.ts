import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from '../promotions/entities/promotion.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Promotion]),
    PromotionsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
