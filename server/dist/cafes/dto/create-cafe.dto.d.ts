declare class FacilityDto {
    facilityKey: string;
    facilityValue?: string;
}
export declare class CreateCafeDto {
    name: string;
    description?: string;
    address: string;
    latitude: number;
    longitude: number;
    phone?: string;
    googlePlaceId?: string;
    wifiAvailable?: boolean;
    wifiSpeedMbps?: number;
    hasMushola?: boolean;
    openingHours?: Record<string, string>;
    priceRange?: string;
    facilities?: FacilityDto[];
}
export {};
