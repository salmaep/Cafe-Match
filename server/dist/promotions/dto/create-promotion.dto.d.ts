export declare class CreatePromotionDto {
    packageId: number;
    type: string;
    billingCycle?: string;
    contentTitle?: string;
    contentDescription?: string;
    contentPhotoUrl?: string;
    highlightedFacilities?: string[];
}
export declare class UpdatePromotionContentDto {
    contentTitle?: string;
    contentDescription?: string;
    contentPhotoUrl?: string;
    highlightedFacilities?: string[];
}
