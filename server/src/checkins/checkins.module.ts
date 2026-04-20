import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinsController } from './checkins.controller';
import { CheckinsService } from './checkins.service';
import { Checkin } from './entities/checkin.entity';
import { UserStreak } from './entities/user-streak.entity';
import { Cafe } from '../cafes/entities/cafe.entity';
import { AchievementsModule } from '../achievements/achievements.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Checkin, UserStreak, Cafe]),
    AchievementsModule,
    NotificationsModule,
  ],
  controllers: [CheckinsController],
  providers: [CheckinsService],
  exports: [CheckinsService],
})
export class CheckinsModule {}
