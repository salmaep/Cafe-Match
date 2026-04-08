import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Transaction } from './entities/transaction.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { Cafe } from '../cafes/entities/cafe.entity';

@Injectable()
export class PaymentsService {
  private readonly serverKey: string;
  private readonly isProduction: boolean;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepo: Repository<Transaction>,
    @InjectRepository(Promotion)
    private readonly promotionsRepo: Repository<Promotion>,
    @InjectRepository(Cafe)
    private readonly cafesRepo: Repository<Cafe>,
    private readonly promotionsService: PromotionsService,
    private readonly configService: ConfigService,
  ) {
    this.serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY') || 'SB-Mid-server-xxx';
    this.isProduction = this.configService.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';
  }

  private get baseUrl(): string {
    return this.isProduction
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1';
  }

  async createSnapTransaction(userId: number, promotionId: number) {
    const promotion = await this.promotionsRepo.findOne({
      where: { id: promotionId },
      relations: ['package', 'cafe'],
    });
    if (!promotion) throw new NotFoundException('Promotion not found');
    if (promotion.cafe?.ownerId !== userId) {
      throw new ForbiddenException('Not your promotion');
    }
    if (promotion.status !== 'pending_payment') {
      throw new BadRequestException('Promotion is not in pending_payment status');
    }

    const amount =
      promotion.billingCycle === 'annual'
        ? Number(promotion.package.priceAnnual)
        : Number(promotion.package.priceMonthly);

    const orderId = `CAFE-${promotion.id}-${Date.now()}`;

    // Call Midtrans Snap API
    const authString = Buffer.from(`${this.serverKey}:`).toString('base64');

    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        item_details: [
          {
            id: `pkg-${promotion.packageId}`,
            price: amount,
            quantity: 1,
            name: `${promotion.package.name} - ${promotion.type} (${promotion.billingCycle})`,
          },
        ],
        customer_details: {
          first_name: promotion.cafe?.name || 'Cafe Owner',
          email: `owner-${userId}@cafematch.id`,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadRequestException(`Midtrans error: ${errorBody}`);
    }

    const snapData = await response.json() as { token: string; redirect_url: string };

    // Save transaction
    const transaction = this.transactionsRepo.create({
      promotionId: promotion.id,
      userId,
      midtransOrderId: orderId,
      midtransSnapToken: snapData.token,
      amount,
      status: 'pending',
    } as Partial<Transaction>);

    await this.transactionsRepo.save(transaction);

    return {
      token: snapData.token,
      redirectUrl: snapData.redirect_url,
      orderId,
    };
  }

  async handleWebhookNotification(body: any) {
    // Verify signature
    const { order_id, status_code, gross_amount, signature_key, transaction_status, payment_type, transaction_id } = body;

    const expectedSignature = createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${this.serverKey}`)
      .digest('hex');

    if (signature_key !== expectedSignature) {
      throw new BadRequestException('Invalid signature');
    }

    const transaction = await this.transactionsRepo.findOne({
      where: { midtransOrderId: order_id },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');

    transaction.rawNotification = body;
    transaction.midtransTransactionId = transaction_id;
    transaction.paymentType = payment_type;

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      transaction.status = 'success';
      transaction.paidAt = new Date();
      await this.transactionsRepo.save(transaction);

      // Activate promotion immediately (no admin approval needed)
      await this.promotionsService.activatePromotion(transaction.promotionId);
    } else if (
      transaction_status === 'deny' ||
      transaction_status === 'cancel' ||
      transaction_status === 'expire'
    ) {
      transaction.status = 'failed';
      await this.transactionsRepo.save(transaction);
    } else {
      // pending, etc
      await this.transactionsRepo.save(transaction);
    }

    return { status: 'ok' };
  }

  async getTransactionStatus(orderId: string, userId: number) {
    const transaction = await this.transactionsRepo.findOne({
      where: { midtransOrderId: orderId, userId },
      relations: ['promotion'],
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }
}
