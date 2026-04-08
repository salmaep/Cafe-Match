import { Repository } from 'typeorm';
import { Promotion } from '../promotions/entities/promotion.entity';
import { PromotionsService } from '../promotions/promotions.service';
export declare class AdminService {
    private readonly promotionsRepo;
    private readonly promotionsService;
    constructor(promotionsRepo: Repository<Promotion>, promotionsService: PromotionsService);
    getPendingPromotions(): Promise<Promotion[]>;
    approvePromotion(promotionId: number): Promise<Promotion>;
    rejectPromotion(promotionId: number, reason: string): Promise<Promotion>;
}
