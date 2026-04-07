import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VotesService } from './votes.service';
import { CastVoteDto } from './dto/cast-vote.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':cafeId')
  castVote(
    @Request() req: any,
    @Param('cafeId', ParseIntPipe) cafeId: number,
    @Body() dto: CastVoteDto,
  ) {
    return this.votesService.castVote(req.user.id, cafeId, dto.purposeIds);
  }

  @Public()
  @Get(':cafeId')
  getTallies(@Param('cafeId', ParseIntPipe) cafeId: number) {
    return this.votesService.getTallies(cafeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':cafeId/me')
  getMyVotes(
    @Request() req: any,
    @Param('cafeId', ParseIntPipe) cafeId: number,
  ) {
    return this.votesService.getUserVotes(req.user.id, cafeId);
  }
}
