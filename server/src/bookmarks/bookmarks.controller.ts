import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post(':cafeId')
  toggle(
    @Request() req: any,
    @Param('cafeId', ParseIntPipe) cafeId: number,
  ) {
    return this.bookmarksService.toggle(req.user.id, cafeId);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.bookmarksService.findByUser(req.user.id);
  }
}
