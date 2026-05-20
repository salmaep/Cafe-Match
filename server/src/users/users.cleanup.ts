import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersCleanupService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // Run at 3am every day — hard-delete users soft-deleted more than 30 days ago
  @Cron('0 3 * * *')
  async purgeDeletedUsers(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.usersRepository
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('deleted_at IS NOT NULL AND deleted_at < :cutoff', { cutoff })
      .execute();
  }
}
