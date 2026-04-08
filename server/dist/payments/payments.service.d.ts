import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Transaction } from './entities/transaction.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { Cafe } from '../cafes/entities/cafe.entity';
export declare class PaymentsService {
    private readonly transactionsRepo;
    private readonly promotionsRepo;
    private readonly cafesRepo;
    private readonly promotionsService;
    private readonly configService;
    private readonly serverKey;
    private readonly isProduction;
    constructor(transactionsRepo: Repository<Transaction>, promotionsRepo: Repository<Promotion>, cafesRepo: Repository<Cafe>, promotionsService: PromotionsService, configService: ConfigService);
    private get baseUrl();
    createSnapTransaction(userId: number, promotionId: number): Promise<{
        token: string;
        redirectUrl: string;
        orderId: string;
    }>;
    handleWebhookNotification(body: any): Promise<{
        status: string;
    }>;
    getTransactionStatus(orderId: string, userId: number): Promise<Transaction>;
}
