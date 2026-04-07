import { Repository } from 'typeorm';
import { CafeVote } from './entities/cafe-vote.entity';
export declare class VotesService {
    private readonly votesRepository;
    constructor(votesRepository: Repository<CafeVote>);
    castVote(userId: number, cafeId: number, purposeIds: number[]): Promise<{
        voted: number[];
    }>;
    getTallies(cafeId: number): Promise<{
        purposeId: number;
        count: number;
    }[]>;
    getUserVotes(userId: number, cafeId: number): Promise<number[]>;
}
