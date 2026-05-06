import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shortlist } from './entities/shortlist.entity';
import { ShortlistsController } from './shortlists.controller';
import { ShortlistsService } from './shortlists.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shortlist])],
  controllers: [ShortlistsController],
  providers: [ShortlistsService],
  exports: [ShortlistsService],
})
export class ShortlistsModule {}
