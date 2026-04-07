import { VotesService } from './votes.service';
import { CastVoteDto } from './dto/cast-vote.dto';
export declare class VotesController {
    private readonly votesService;
    constructor(votesService: VotesService);
    castVote(req: any, cafeId: number, dto: CastVoteDto): Promise<{
        voted: number[];
    }>;
    getTallies(cafeId: number): Promise<{
        purposeId: number;
        count: number;
    }[]>;
    getMyVotes(req: any, cafeId: number): Promise<number[]>;
}
