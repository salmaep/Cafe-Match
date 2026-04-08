import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionContentDto } from './dto/create-promotion.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Public()
  @Get('packages')
  getPackages() {
    return this.promotionsService.getPackages();
  }

  @Public()
  @Get('active')
  getActivePromotions(@Query('type') type?: string) {
    return this.promotionsService.getActivePromotions(type);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Get('packages/:id/availability')
  getAvailability(
    @Param('id', ParseIntPipe) packageId: number,
    @Query('type') type: string,
  ) {
    return this.promotionsService.getAvailability(packageId, type || 'new_cafe');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Post()
  createPromotion(@Request() req: any, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.createPromotion(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Get('mine')
  getMyPromotions(@Request() req: any) {
    return this.promotionsService.getMyPromotions(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Get(':id')
  getPromotion(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.promotionsService.getPromotionById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Put(':id/content')
  updateContent(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() dto: UpdatePromotionContentDto,
  ) {
    return this.promotionsService.updateContent(id, req.user.id, dto);
  }
}
