import { Controller, Post, Get, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { CheckinsService } from './checkins.service';
import { CheckInDto, CheckOutDto } from './dto/checkin.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('checkins')
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  @Post('in')
  checkIn(@CurrentUser() user: any, @Body() dto: CheckInDto) {
    return this.checkinsService.checkIn(user.id, dto);
  }

  @Post('out')
  checkOut(@CurrentUser() user: any, @Body() dto: CheckOutDto) {
    return this.checkinsService.checkOut(user.id, dto);
  }

  @Get('active')
  getActive(@CurrentUser() user: any) {
    return this.checkinsService.getActive(user.id);
  }

  @Get('history')
  history(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.checkinsService.history(user.id, page || 1, limit || 20);
  }

  @Public()
  @Get('cafe/:cafeId/leaderboard')
  leaderboard(@Param('cafeId', ParseIntPipe) cafeId: number) {
    return this.checkinsService.leaderboard(cafeId);
  }

  @Get('streak')
  streak(@CurrentUser() user: any) {
    return this.checkinsService.getStreak(user.id);
  }

  @Public()
  @Get('global-leaderboard')
  globalLeaderboard() {
    return this.checkinsService.globalLeaderboard();
  }
}
