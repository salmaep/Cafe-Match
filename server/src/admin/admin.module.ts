import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from '../promotions/entities/promotion.entity';
import { AdminController } from './admin.controller';
import { MeiliAdminController } from './meili-admin.controller';
import { AdminService } from './admin.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { MeiliModule } from '../meili/meili.module';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Promotion]),
    PromotionsModule,
    MeiliModule,
  ],
  controllers: [AdminController, MeiliAdminController],
  providers: [AdminService, AdminApiKeyGuard],
})
export class AdminModule {}
