import { Controller, Post, Put, Delete, Get, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
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
  ) {
    return this.reviewsService.findByCafe(cafeId, page || 1, limit || 20);
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
