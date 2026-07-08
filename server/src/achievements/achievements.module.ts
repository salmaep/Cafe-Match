import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { PointsService } from './points.service';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { PointEvent } from './entities/point-event.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserAchievement, PointEvent]),
    NotificationsModule,
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService, PointsService],
  exports: [AchievementsService, PointsService],
})
export class AchievementsModule {}
