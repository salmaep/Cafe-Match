import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('track')
  trackEvent(
    @Body() body: { cafeId: number; eventType: string; promotionId?: number },
  ) {
    return this.analyticsService.trackEvent(
      body.cafeId,
      body.eventType,
      body.promotionId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Get('cafe/:cafeId/summary')
  getSummary(
    @Param('cafeId', ParseIntPipe) cafeId: number,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getSummary(cafeId, days ? parseInt(days, 10) : 30);
  }
}
