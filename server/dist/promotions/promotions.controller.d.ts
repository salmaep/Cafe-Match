import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionContentDto } from './dto/create-promotion.dto';
export declare class PromotionsController {
    private readonly promotionsService;
    constructor(promotionsService: PromotionsService);
    getPackages(): Promise<import("./entities/advertisement-package.entity").AdvertisementPackage[]>;
    getActivePromotions(type?: string): Promise<import("./entities/promotion.entity").Promotion[]>;
    getAvailability(packageId: number, type: string): Promise<{
        packageId: number;
        type: string;
        month: string;
        totalSlots: number;
        usedSlots: number;
        availableSlots: number;
    }>;
    createPromotion(req: any, dto: CreatePromotionDto): Promise<import("./entities/promotion.entity").Promotion>;
    getMyPromotions(req: any): Promise<import("./entities/promotion.entity").Promotion[]>;
    getPromotion(id: number, req: any): Promise<import("./entities/promotion.entity").Promotion>;
    updateContent(id: number, req: any, dto: UpdatePromotionContentDto): Promise<import("./entities/promotion.entity").Promotion>;
}
