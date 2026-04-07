import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { Cafe } from '../cafes/entities/cafe.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
    private readonly dataSource: DataSource,
  ) {}

  async toggle(userId: number, cafeId: number) {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(Favorite, {
        where: { userId, cafeId },
      });

      if (existing) {
        await manager.remove(existing);
        await manager.decrement(Cafe, { id: cafeId }, 'favoritesCount', 1);
        return { favorited: false };
      } else {
        await manager.save(Favorite, { userId, cafeId });
        await manager.increment(Cafe, { id: cafeId }, 'favoritesCount', 1);
        return { favorited: true };
      }
    });
  }

  async findByUser(userId: number) {
    return this.favoritesRepository.find({
      where: { userId },
      relations: ['cafe'],
      order: { createdAt: 'DESC' },
    });
  }
}
