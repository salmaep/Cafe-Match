import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CafeMenu } from './entities/cafe-menu.entity';

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(CafeMenu)
    private readonly menusRepository: Repository<CafeMenu>,
  ) {}

  async findByCafe(cafeId: number) {
    return this.menusRepository.find({
      where: { cafeId, isAvailable: true },
      order: { category: 'ASC', itemName: 'ASC' },
    });
  }
}
