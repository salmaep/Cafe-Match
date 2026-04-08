import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OwnerService } from './owner.service';
import { UpdateCafeDto, CreateOwnerCafeDto, UpdateMenusDto } from './dto/update-cafe.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
@Controller('owner')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.ownerService.getDashboard(req.user.id);
  }

  @Get('cafe')
  getCafe(@Request() req: any) {
    return this.ownerService.getOwnerCafe(req.user.id);
  }

  @Post('cafe')
  createCafe(@Request() req: any, @Body() dto: CreateOwnerCafeDto) {
    return this.ownerService.createCafe(req.user.id, dto);
  }

  @Put('cafe')
  updateCafe(@Request() req: any, @Body() dto: UpdateCafeDto) {
    return this.ownerService.updateCafe(req.user.id, dto);
  }

  @Put('cafe/menus')
  updateMenus(@Request() req: any, @Body() dto: UpdateMenusDto) {
    return this.ownerService.updateMenus(req.user.id, dto.items);
  }
}
