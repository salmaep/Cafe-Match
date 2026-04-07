import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CafePhoto } from './entities/cafe-photo.entity';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(CafePhoto)
    private readonly photosRepository: Repository<CafePhoto>,
  ) {}

  async findByCafe(cafeId: number) {
    return this.photosRepository.find({
      where: { cafeId },
      order: { displayOrder: 'ASC' },
    });
  }
}
