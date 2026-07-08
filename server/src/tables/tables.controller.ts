import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { OpenTableDto } from './dto/open-table.dto';
import { JoinTableDto } from './dto/join-table.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  open(@CurrentUser() user: any, @Body() dto: OpenTableDto) {
    return this.tablesService.openTable(user.id, dto);
  }

  @Get('me/active')
  myActive(@CurrentUser() user: any) {
    return this.tablesService.myActive(user.id);
  }

  @Get('me/requests')
  myRequests(@CurrentUser() user: any) {
    return this.tablesService.myRequests(user.id);
  }

  /** Public — powers the emerald map pins (works logged-out). */
  @Public()
  @Get('active-cafes')
  activeCafes() {
    return this.tablesService.activeCafeIds();
  }

  @Get('cafe/:cafeId')
  listByCafe(
    @CurrentUser() user: any,
    @Param('cafeId', ParseIntPipe) cafeId: number,
  ) {
    return this.tablesService.listByCafe(cafeId, user.id);
  }

  @Put(':id/close')
  close(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.tablesService.closeTable(user.id, id);
  }

  @Post(':id/requests')
  requestJoin(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: JoinTableDto,
  ) {
    return this.tablesService.requestJoin(user.id, id, dto);
  }

  @Put('requests/:requestId/accept')
  accept(
    @CurrentUser() user: any,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.tablesService.acceptRequest(user.id, requestId);
  }

  @Put('requests/:requestId/decline')
  decline(
    @CurrentUser() user: any,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.tablesService.declineRequest(user.id, requestId);
  }

  @Put('requests/:requestId/cancel')
  cancel(
    @CurrentUser() user: any,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.tablesService.cancelRequest(user.id, requestId);
  }
}
