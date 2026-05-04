import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cafe } from './entities/cafe.entity';
import { CafeFacility } from './entities/cafe-facility.entity';
import { PurposeRequirement } from '../purposes/entities/purpose-requirement.entity';
import { CafesController } from './cafes.controller';
import { CafesService } from './cafes.service';
import { MeiliModule } from '../meili/meili.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cafe, CafeFacility, PurposeRequirement]),
    MeiliModule,
  ],
  controllers: [CafesController],
  providers: [CafesService],
  exports: [CafesService],
})
export class CafesModule {}
