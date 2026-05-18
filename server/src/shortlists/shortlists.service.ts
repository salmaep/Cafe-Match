import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Shortlist } from './entities/shortlist.entity';
import { parseAddressParts } from '../meili/helpers/address-parser';

@Injectable()
export class ShortlistsService {
  constructor(
    @InjectRepository(Shortlist)
    private readonly shortlistsRepository: Repository<Shortlist>,
    private readonly dataSource: DataSource,
  ) {}

  async add(userId: number, cafeId: number) {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(Shortlist, {
        where: { userId, cafeId },
      });
      if (existing) {
        return { shortlisted: true };
      }
      await manager.save(Shortlist, { userId, cafeId });
      return { shortlisted: true };
    });
  }

  async remove(userId: number, cafeId: number) {
    const existing = await this.shortlistsRepository.findOne({
      where: { userId, cafeId },
    });
    if (!existing) {
      return { shortlisted: false };
    }
    await this.shortlistsRepository.remove(existing);
    return { shortlisted: false };
  }

  async toggle(userId: number, cafeId: number) {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(Shortlist, {
        where: { userId, cafeId },
      });
      if (existing) {
        await manager.remove(existing);
        return { shortlisted: false };
      }
      await manager.save(Shortlist, { userId, cafeId });
      return { shortlisted: true };
    });
  }

  async findByUser(userId: number) {
    const items = await this.shortlistsRepository.find({
      where: { userId },
      relations: ['cafe', 'cafe.features', 'cafe.photos'],
      order: { createdAt: 'DESC' },
    });
    // Enrich each cafe with derived locality (district/city) so the client
    // CafeCard can render the same info it shows in Explore (which gets these
    // from the Meili document via address-parser).
    return items.map((it) => ({
      ...it,
      cafe: it.cafe ? enrichCafe(it.cafe) : it.cafe,
    }));
  }

  async clear(userId: number) {
    await this.shortlistsRepository.delete({ userId });
    return { cleared: true };
  }
}

function enrichCafe<T extends { address?: string | null }>(
  cafe: T,
): T & {
  city: string | null;
  district: string | null;
} {
  const { city, district } = parseAddressParts(cafe.address || '');
  return { ...cafe, city, district };
}
