import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':cafeId')
  toggle(
    @Request() req: any,
    @Param('cafeId', ParseIntPipe) cafeId: number,
  ) {
    return this.favoritesService.toggle(req.user.id, cafeId);
  }

  @Get()
  findAll(@Request() req: any, @Query('since') since?: string) {
    return this.favoritesService.findByUser(req.user.id, since);
  }
}
