import { Controller, Get, Put, Post, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';

class RegisterTokenDto {
  @IsString()
  token: string;

  @IsString()
  platform: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.notificationsService.list(user.id, page || 1, limit || 30);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: any) {
    return this.notificationsService.unreadCount(user.id);
  }

  @Put(':id/read')
  markRead(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Put('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Post('register-token')
  registerToken(@CurrentUser() user: any, @Body() dto: RegisterTokenDto) {
    return this.notificationsService.registerToken(user.id, dto.token, dto.platform);
  }
}
