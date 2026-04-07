import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CafeVote } from './entities/cafe-vote.entity';

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(CafeVote)
    private readonly votesRepository: Repository<CafeVote>,
  ) {}

  async castVote(userId: number, cafeId: number, purposeIds: number[]) {
    if (purposeIds.length > 3) {
      throw new BadRequestException('You can vote for up to 3 categories');
    }

    // Remove existing votes for this user+cafe
    await this.votesRepository.delete({ userId, cafeId });

    // Insert new votes
    const votes = purposeIds.map((purposeId) =>
      this.votesRepository.create({ userId, cafeId, purposeId }),
    );
    await this.votesRepository.save(votes);

    return { voted: purposeIds };
  }

  async getTallies(cafeId: number) {
    const results = await this.votesRepository
      .createQueryBuilder('v')
      .select('v.purpose_id', 'purposeId')
      .addSelect('COUNT(*)', 'count')
      .where('v.cafe_id = :cafeId', { cafeId })
      .groupBy('v.purpose_id')
      .getRawMany();

    return results.map((r) => ({
      purposeId: Number(r.purposeId),
      count: Number(r.count),
    }));
  }

  async getUserVotes(userId: number, cafeId: number) {
    const votes = await this.votesRepository.find({
      where: { userId, cafeId },
    });
    return votes.map((v) => v.purposeId);
  }
}
