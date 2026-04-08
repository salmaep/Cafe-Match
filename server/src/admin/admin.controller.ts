import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('promotions')
  getPendingPromotions() {
    return this.adminService.getPendingPromotions();
  }

  @Post('promotions/:id/approve')
  approvePromotion(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approvePromotion(id);
  }

  @Post('promotions/:id/reject')
  rejectPromotion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
  ) {
    return this.adminService.rejectPromotion(id, body.reason);
  }
}
