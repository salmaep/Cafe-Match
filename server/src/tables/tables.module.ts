import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { TablesSweepService } from './tables.sweep';
import { CafeTable } from './entities/cafe-table.entity';
import { TableJoinRequest } from './entities/table-join-request.entity';
import { User } from '../users/entities/user.entity';
import { Cafe } from '../cafes/entities/cafe.entity';
import { Friendship } from '../friends/entities/friendship.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CafeTable,
      TableJoinRequest,
      User,
      Cafe,
      Friendship,
    ]),
    NotificationsModule,
    AchievementsModule,
  ],
  controllers: [TablesController],
  providers: [TablesService, TablesSweepService],
  exports: [TablesService],
})
export class TablesModule {}
