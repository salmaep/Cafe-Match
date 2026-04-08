import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { AdvertisementPackage } from './entities/advertisement-package.entity';
import { PromotionSlot } from './entities/promotion-slot.entity';
import { Cafe } from '../cafes/entities/cafe.entity';
import { CreatePromotionDto, UpdatePromotionContentDto } from './dto/create-promotion.dto';
export declare class PromotionsService {
    private readonly promotionsRepo;
    private readonly packagesRepo;
    private readonly slotsRepo;
    private readonly cafesRepo;
    constructor(promotionsRepo: Repository<Promotion>, packagesRepo: Repository<AdvertisementPackage>, slotsRepo: Repository<PromotionSlot>, cafesRepo: Repository<Cafe>);
    getPackages(): Promise<AdvertisementPackage[]>;
    getAvailability(packageId: number, type: string): Promise<{
        packageId: number;
        type: string;
        month: string;
        totalSlots: number;
        usedSlots: number;
        availableSlots: number;
    }>;
    createPromotion(userId: number, dto: CreatePromotionDto): Promise<Promotion>;
    getMyPromotions(userId: number): Promise<Promotion[]>;
    getPromotionById(id: number, userId: number): Promise<Promotion>;
    updateContent(id: number, userId: number, dto: UpdatePromotionContentDto): Promise<Promotion>;
    activatePromotion(promotionId: number): Promise<Promotion>;
    rejectPromotion(promotionId: number, reason: string): Promise<Promotion>;
    getActivePromotions(type?: string): Promise<Promotion[]>;
}
