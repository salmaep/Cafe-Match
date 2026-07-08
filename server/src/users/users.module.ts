import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DeletionRequest } from './entities/deletion-request.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DeletionRequestsController } from './deletion-requests.controller';
import { UsersCleanupService } from './users.cleanup';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DeletionRequest]),
    AchievementsModule,
  ],
  controllers: [UsersController, DeletionRequestsController],
  providers: [UsersService, UsersCleanupService],
  exports: [UsersService],
})
export class UsersModule {}
