import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Cafe } from '../cafes/entities/cafe.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Promotion, Cafe]),
    PromotionsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
