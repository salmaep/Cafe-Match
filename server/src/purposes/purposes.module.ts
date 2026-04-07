import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purpose } from './entities/purpose.entity';
import { PurposeRequirement } from './entities/purpose-requirement.entity';
import { PurposesController } from './purposes.controller';
import { PurposesService } from './purposes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Purpose, PurposeRequirement])],
  controllers: [PurposesController],
  providers: [PurposesService],
  exports: [PurposesService],
})
export class PurposesModule {}
