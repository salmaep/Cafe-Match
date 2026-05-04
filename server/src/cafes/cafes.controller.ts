import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CafesService } from './cafes.service';
import { SearchCafesDto } from './dto/search-cafes.dto';
import { CreateCafeDto } from './dto/create-cafe.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('cafes')
export class CafesController {
  constructor(private readonly cafesService: CafesService) {}

  @Public()
  @Get()
  search(@Query() dto: SearchCafesDto) {
    return this.cafesService.search(dto);
  }

  @Public()
  @Get('promoted')
  getPromoted(@Query('type') type?: string) {
    return this.cafesService.findPromotedCafes(type);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cafesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCafeDto) {
    return this.cafesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(@Param('id', ParseIntPipe) id: number) {
    await this.cafesService.softRemove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id', ParseIntPipe) id: number) {
    await this.cafesService.restore(id);
    return { message: 'Cafe restored successfully' };
  }
}
