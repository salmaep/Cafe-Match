import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { RecapsService } from './recaps.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsInt } from 'class-validator';

class GenerateRecapDto {
  @IsInt()
  year: number;
}

@Controller('recaps')
export class RecapsController {
  constructor(private readonly recapsService: RecapsService) {}

  @Get(':year')
  getRecap(@CurrentUser() user: any, @Param('year', ParseIntPipe) year: number) {
    return this.recapsService.getRecap(user.id, year);
  }

  @Post('generate')
  generate(@CurrentUser() user: any, @Body() dto: GenerateRecapDto) {
    return this.recapsService.generateRecap(user.id, dto.year);
  }
}
