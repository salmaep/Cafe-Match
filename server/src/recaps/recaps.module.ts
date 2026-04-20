import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecapsController } from './recaps.controller';
import { RecapsService } from './recaps.service';
import { UserRecap } from './entities/user-recap.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserRecap])],
  controllers: [RecapsController],
  providers: [RecapsService],
  exports: [RecapsService],
})
export class RecapsModule {}
