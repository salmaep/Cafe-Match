import { Controller, Post, Put, Get, Param, Body, ParseIntPipe } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';

class SendRequestDto {
  @IsString()
  friendCode: string;
}

class ThrowEmojiDto {
  @IsString()
  emoji: string;
}

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  sendRequest(@CurrentUser() user: any, @Body() dto: SendRequestDto) {
    return this.friendsService.sendRequest(user.id, dto.friendCode);
  }

  @Put('request/:id/accept')
  accept(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.friendsService.acceptRequest(user.id, id);
  }

  @Put('request/:id/reject')
  reject(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.friendsService.rejectRequest(user.id, id);
  }

  @Get('requests/pending')
  pending(@CurrentUser() user: any) {
    return this.friendsService.pendingRequests(user.id);
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.friendsService.friendList(user.id);
  }

  @Get('map')
  map(@CurrentUser() user: any) {
    return this.friendsService.friendsOnMap(user.id);
  }

  @Post(':friendId/emoji')
  throwEmoji(
    @CurrentUser() user: any,
    @Param('friendId', ParseIntPipe) friendId: number,
    @Body() dto: ThrowEmojiDto,
  ) {
    return this.friendsService.throwEmoji(user.id, friendId, dto.emoji);
  }
}
