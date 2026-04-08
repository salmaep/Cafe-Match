import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../promotions/entities/promotion.entity';
import { PromotionsService } from '../promotions/promotions.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionsRepo: Repository<Promotion>,
    private readonly promotionsService: PromotionsService,
  ) {}

  async getPendingPromotions() {
    return this.promotionsRepo.find({
      where: { status: 'pending_review' },
      relations: ['package', 'cafe'],
      order: { createdAt: 'ASC' },
    });
  }

  async approvePromotion(promotionId: number) {
    return this.promotionsService.activatePromotion(promotionId);
  }

  async rejectPromotion(promotionId: number, reason: string) {
    return this.promotionsService.rejectPromotion(promotionId, reason);
  }
}
