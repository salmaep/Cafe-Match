import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { Cafe } from '../cafes/entities/cafe.entity';

/**
 * Parse `since` query param like "7d", "24h", "30m" into a Date cutoff.
 * Returns null if param is missing/invalid (caller should fall back to "all time").
 */
function parseSinceCutoff(since?: string): Date | null {
  if (!since) return null;
  const match = /^(\d+)([dhm])$/.exec(since.trim().toLowerCase());
  if (!match) {
    throw new BadRequestException(
      'Invalid `since` format. Use "7d", "24h", or "30m".',
    );
  }
  const value = Number(match[1]);
  const unit = match[2];
  const ms =
    unit === 'd' ? value * 24 * 60 * 60 * 1000
    : unit === 'h' ? value * 60 * 60 * 1000
    : value * 60 * 1000;
  return new Date(Date.now() - ms);
}

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

  async findByUser(userId: number, since?: string) {
    const cutoff = parseSinceCutoff(since);
    return this.favoritesRepository.find({
      where: cutoff
        ? { userId, createdAt: MoreThanOrEqual(cutoff) }
        : { userId },
      relations: ['cafe'],
      order: { createdAt: 'DESC' },
    });
  }
}
