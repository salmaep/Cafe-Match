import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CafePhoto } from './entities/cafe-photo.entity';
import { PhotosService } from './photos.service';

@Module({
  imports: [TypeOrmModule.forFeature([CafePhoto])],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
