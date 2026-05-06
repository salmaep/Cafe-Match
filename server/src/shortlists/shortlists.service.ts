import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Shortlist } from './entities/shortlist.entity';

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
    return this.shortlistsRepository.find({
      where: { userId },
      relations: ['cafe'],
      order: { createdAt: 'DESC' },
    });
  }

  async clear(userId: number) {
    await this.shortlistsRepository.delete({ userId });
    return { cleared: true };
  }
}
