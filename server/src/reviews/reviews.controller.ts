import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService, ReviewSort } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':cafeId')
  create(
    @CurrentUser() user: any,
    @Param('cafeId', ParseIntPipe) cafeId: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.id, cafeId, dto);
  }

  @Put(':reviewId')
  update(
    @CurrentUser() user: any,
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(user.id, reviewId, dto);
  }

  @Delete(':reviewId')
  delete(
    @CurrentUser() user: any,
    @Param('reviewId', ParseIntPipe) reviewId: number,
  ) {
    return this.reviewsService.delete(user.id, reviewId);
  }

  @Public()
  @Get('cafe/:cafeId')
  findByCafe(
    @Param('cafeId', ParseIntPipe) cafeId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
  ) {
    const sortNorm: ReviewSort = sort === 'recent' ? 'recent' : 'helpful';
    return this.reviewsService.findByCafe(
      cafeId,
      page || 1,
      limit || 20,
      sortNorm,
    );
  }

  /** Returns review IDs the current user has voted helpful on for this cafe.
   *  Lets the public list endpoint stay public while web/mobile still know
   *  which buttons should render as already-voted. */
  @Get('cafe/:cafeId/my-votes')
  myVotes(
    @CurrentUser() user: any,
    @Param('cafeId', ParseIntPipe) cafeId: number,
  ) {
    return this.reviewsService.myVoteIds(user.id, cafeId);
  }

  @Post(':reviewId/vote')
  toggleVote(
    @CurrentUser() user: any,
    @Param('reviewId', ParseIntPipe) reviewId: number,
  ) {
    return this.reviewsService.toggleVote(user.id, reviewId);
  }

  @Public()
  @Get('cafe/:cafeId/summary')
  summary(@Param('cafeId', ParseIntPipe) cafeId: number) {
    return this.reviewsService.summary(cafeId);
  }

  @Get('me')
  myReviews(@CurrentUser() user: any) {
    return this.reviewsService.findByUser(user.id);
  }
}
