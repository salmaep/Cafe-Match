import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Post('create')
  createPayment(@Request() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createSnapTransaction(req.user.id, dto.promotionId);
  }

  @Public()
  @Post('webhook/midtrans')
  handleWebhook(@Body() body: any) {
    return this.paymentsService.handleWebhookNotification(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Get('status/:orderId')
  getStatus(@Param('orderId') orderId: string, @Request() req: any) {
    return this.paymentsService.getTransactionStatus(orderId, req.user.id);
  }
}
