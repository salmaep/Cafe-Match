import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Public()
  @Get()
  findAll() {
    return this.achievementsService.findAll();
  }

  @Get('me')
  myAchievements(@CurrentUser() user: any) {
    return this.achievementsService.findByUser(user.id);
  }

  @Public()
  @Get('user/:userId')
  userAchievements(@Param('userId', ParseIntPipe) userId: number) {
    return this.achievementsService.findPublicByUser(userId);
  }
}
