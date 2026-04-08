import { AdvertisementPackage } from './advertisement-package.entity';
export declare class PromotionSlot {
    id: number;
    packageId: number;
    promotionType: string;
    month: string;
    totalSlots: number;
    usedSlots: number;
    reservedSlots: number;
    package: AdvertisementPackage;
}
