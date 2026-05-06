import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ShortlistsService } from './shortlists.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('shortlists')
export class ShortlistsController {
  constructor(private readonly shortlistsService: ShortlistsService) {}

  @Post(':cafeId')
  add(@Request() req: any, @Param('cafeId', ParseIntPipe) cafeId: number) {
    return this.shortlistsService.add(req.user.id, cafeId);
  }

  @Delete(':cafeId')
  remove(@Request() req: any, @Param('cafeId', ParseIntPipe) cafeId: number) {
    return this.shortlistsService.remove(req.user.id, cafeId);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.shortlistsService.findByUser(req.user.id);
  }

  @Delete()
  clear(@Request() req: any) {
    return this.shortlistsService.clear(req.user.id);
  }
}
