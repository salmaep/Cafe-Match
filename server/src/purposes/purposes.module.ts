import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purpose } from './entities/purpose.entity';
import { PurposeRequirement } from './entities/purpose-requirement.entity';
import { PurposesController } from './purposes.controller';
import { PurposesAdminController } from './purposes-admin.controller';
import { PurposesService } from './purposes.service';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Purpose, PurposeRequirement])],
  controllers: [PurposesController, PurposesAdminController],
  providers: [PurposesService, AdminApiKeyGuard],
  exports: [PurposesService],
})
export class PurposesModule {}
