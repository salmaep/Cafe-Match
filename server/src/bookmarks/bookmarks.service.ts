import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Bookmark } from './entities/bookmark.entity';
import { Cafe } from '../cafes/entities/cafe.entity';
import { parseAddressParts } from '../meili/helpers/address-parser';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarksRepository: Repository<Bookmark>,
    private readonly dataSource: DataSource,
  ) {}

  async toggle(userId: number, cafeId: number) {
    return this.dataSource.transaction(async (manager) => {
      // Load the cafe row up-front so we can mutate + save() it. We avoid
      // manager.increment/decrement here because raw SQL UPDATEs do NOT
      // dispatch entity subscribers — CafeMeiliSubscriber.afterUpdate would
      // be skipped, leaving Meilisearch's bookmarksCount stale.
      const cafe = await manager.findOne(Cafe, { where: { id: cafeId } });
      if (!cafe) throw new NotFoundException('Cafe not found');

      const existing = await manager.findOne(Bookmark, {
        where: { userId, cafeId },
      });

      if (existing) {
        await manager.remove(existing);
        cafe.bookmarksCount = Math.max(0, (cafe.bookmarksCount ?? 0) - 1);
        await manager.save(cafe);
        return { bookmarked: false };
      } else {
        await manager.save(Bookmark, { userId, cafeId });
        cafe.bookmarksCount = (cafe.bookmarksCount ?? 0) + 1;
        await manager.save(cafe);
        return { bookmarked: true };
      }
    });
  }

  async findByUser(userId: number) {
    const items = await this.bookmarksRepository.find({
      where: { userId },
      relations: ['cafe', 'cafe.features', 'cafe.photos'],
      order: { createdAt: 'DESC' },
    });
    return items.map((it) => ({
      ...it,
      cafe: it.cafe ? enrichCafe(it.cafe) : it.cafe,
    }));
  }

  async isBookmarked(userId: number, cafeId: number): Promise<boolean> {
    const count = await this.bookmarksRepository.count({
      where: { userId, cafeId },
    });
    return count > 0;
  }
}

function enrichCafe<T extends { address?: string | null }>(cafe: T): T & {
  city: string | null;
  district: string | null;
} {
  const { city, district } = parseAddressParts(cafe.address || '');
  return { ...cafe, city, district };
}
