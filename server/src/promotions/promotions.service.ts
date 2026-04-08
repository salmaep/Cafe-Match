import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { AdvertisementPackage } from './entities/advertisement-package.entity';
import { PromotionSlot } from './entities/promotion-slot.entity';
import { Cafe } from '../cafes/entities/cafe.entity';
import { CreatePromotionDto, UpdatePromotionContentDto } from './dto/create-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionsRepo: Repository<Promotion>,
    @InjectRepository(AdvertisementPackage)
    private readonly packagesRepo: Repository<AdvertisementPackage>,
    @InjectRepository(PromotionSlot)
    private readonly slotsRepo: Repository<PromotionSlot>,
    @InjectRepository(Cafe)
    private readonly cafesRepo: Repository<Cafe>,
  ) {}

  async getPackages() {
    return this.packagesRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async getAvailability(packageId: number, type: string) {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const pkg = await this.packagesRepo.findOne({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('Package not found');

    let slot = await this.slotsRepo.findOne({
      where: { packageId, promotionType: type, month: currentMonth },
    });

    if (!slot) {
      // Auto-create slot record for current month
      slot = this.slotsRepo.create({
        packageId,
        promotionType: type,
        month: currentMonth,
        totalSlots: pkg.monthlySlots,
        usedSlots: 0,
        reservedSlots: 0,
      });
      await this.slotsRepo.save(slot);
    }

    return {
      packageId,
      type,
      month: currentMonth,
      totalSlots: slot.totalSlots,
      usedSlots: slot.usedSlots,
      availableSlots: slot.totalSlots - slot.usedSlots - slot.reservedSlots,
    };
  }

  async createPromotion(userId: number, dto: CreatePromotionDto) {
    const cafe = await this.cafesRepo.findOne({ where: { ownerId: userId } });
    if (!cafe) throw new NotFoundException('Register your cafe first');

    // Check no other active/pending promotion of same type
    const existing = await this.promotionsRepo.findOne({
      where: {
        cafeId: cafe.id,
        status: 'active' as any,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'You already have an active promotion. Wait for it to expire or contact support.',
      );
    }

    const pkg = await this.packagesRepo.findOne({ where: { id: dto.packageId } });
    if (!pkg) throw new NotFoundException('Package not found');

    const promotion = this.promotionsRepo.create({
      cafeId: cafe.id,
      packageId: dto.packageId,
      type: dto.type,
      billingCycle: dto.billingCycle || 'monthly',
      status: 'pending_payment',
      contentTitle: dto.contentTitle || null,
      contentDescription: dto.contentDescription || null,
      contentPhotoUrl: dto.contentPhotoUrl || null,
      highlightedFacilities: dto.highlightedFacilities || null,
    } as Partial<Promotion>);

    return this.promotionsRepo.save(promotion);
  }

  async getMyPromotions(userId: number) {
    const cafe = await this.cafesRepo.findOne({ where: { ownerId: userId } });
    if (!cafe) return [];

    return this.promotionsRepo.find({
      where: { cafeId: cafe.id },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPromotionById(id: number, userId: number) {
    const promotion = await this.promotionsRepo.findOne({
      where: { id },
      relations: ['package', 'cafe'],
    });
    if (!promotion) throw new NotFoundException('Promotion not found');
    if (promotion.cafe?.ownerId !== userId) {
      throw new ForbiddenException('Not your promotion');
    }
    return promotion;
  }

  async updateContent(id: number, userId: number, dto: UpdatePromotionContentDto) {
    const promotion = await this.getPromotionById(id, userId);
    Object.assign(promotion, dto);
    return this.promotionsRepo.save(promotion);
  }

  // Called after payment success — activate immediately
  async activatePromotion(promotionId: number) {
    const promotion = await this.promotionsRepo.findOne({
      where: { id: promotionId },
      relations: ['package'],
    });
    if (!promotion) throw new NotFoundException('Promotion not found');
    if (promotion.status !== 'pending_payment' && promotion.status !== 'pending_review') {
      throw new BadRequestException('Promotion cannot be activated from current status');
    }

    // Check slot availability
    const currentMonth = new Date().toISOString().slice(0, 7);
    let slot = await this.slotsRepo.findOne({
      where: {
        packageId: promotion.packageId,
        promotionType: promotion.type,
        month: currentMonth,
      },
    });

    if (!slot) {
      slot = this.slotsRepo.create({
        packageId: promotion.packageId,
        promotionType: promotion.type,
        month: currentMonth,
        totalSlots: promotion.package?.monthlySlots || 20,
        usedSlots: 0,
        reservedSlots: 0,
      });
      await this.slotsRepo.save(slot);
    }

    if (slot.usedSlots >= slot.totalSlots) {
      throw new BadRequestException('No available slots for this package/period');
    }

    // Reserve slot
    slot.usedSlots += 1;
    await this.slotsRepo.save(slot);

    // Activate promotion
    const now = new Date();
    const durationDays = promotion.billingCycle === 'annual' ? 365 : 30;
    const expiresAt = new Date(now.getTime() + durationDays * 86400000);

    promotion.status = 'active';
    promotion.startedAt = now;
    promotion.expiresAt = expiresAt;
    await this.promotionsRepo.save(promotion);

    // Update cafe flags
    await this.cafesRepo.update(promotion.cafeId, {
      hasActivePromotion: true,
      activePromotionType: promotion.type,
    });

    return promotion;
  }

  async rejectPromotion(promotionId: number, reason: string) {
    const promotion = await this.promotionsRepo.findOne({ where: { id: promotionId } });
    if (!promotion) throw new NotFoundException('Promotion not found');

    promotion.status = 'rejected';
    promotion.rejectionReason = reason;
    return this.promotionsRepo.save(promotion);
  }

  // Get active promoted cafes for user-facing app
  async getActivePromotions(type?: string) {
    const qb = this.promotionsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.cafe', 'cafe')
      .leftJoinAndSelect('p.package', 'pkg')
      .where('p.status = :status', { status: 'active' })
      .andWhere('p.expires_at > NOW()');

    if (type) {
      qb.andWhere('p.type = :type', { type });
    }

    qb.orderBy('pkg.display_order', 'DESC')
      .addOrderBy('p.started_at', 'ASC');

    return qb.getMany();
  }
}
