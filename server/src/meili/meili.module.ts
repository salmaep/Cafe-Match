import { Module } from '@nestjs/common';
import { MeiliService } from './meili.service';
import { MeiliCafesService } from './meili-cafes.service';
import { CafeMeiliSubscriber } from './meili-cafes.subscriber';

@Module({
  providers: [MeiliService, MeiliCafesService, CafeMeiliSubscriber],
  exports: [MeiliCafesService],
})
export class MeiliModule {}
