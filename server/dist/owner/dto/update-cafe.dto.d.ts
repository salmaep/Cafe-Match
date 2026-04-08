export declare class UpdateCafeDto {
    name?: string;
    address?: string;
    phone?: string;
    description?: string;
    wifiAvailable?: boolean;
    wifiSpeedMbps?: number;
    hasMushola?: boolean;
    openingHours?: Record<string, string>;
    priceRange?: string;
    latitude?: number;
    longitude?: number;
}
export declare class CreateOwnerCafeDto {
    name: string;
    address: string;
    phone?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
}
export declare class UpdateMenuItemDto {
    id?: number;
    category: string;
    itemName: string;
    price: number;
    description?: string;
    isAvailable?: boolean;
}
export declare class UpdateMenusDto {
    items: UpdateMenuItemDto[];
}
