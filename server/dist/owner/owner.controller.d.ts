import { OwnerService } from './owner.service';
import { UpdateCafeDto, CreateOwnerCafeDto, UpdateMenusDto } from './dto/update-cafe.dto';
export declare class OwnerController {
    private readonly ownerService;
    constructor(ownerService: OwnerService);
    getDashboard(req: any): Promise<{
        hasCafe: boolean;
        cafe?: undefined;
        analytics?: undefined;
        activePromotion?: undefined;
        pendingCount?: undefined;
    } | {
        hasCafe: boolean;
        cafe: {
            id: number;
            name: string;
            bookmarksCount: number;
            favoritesCount: number;
        };
        analytics: {
            totalViews: number;
            totalClicks: number;
        };
        activePromotion: {
            id: number;
            type: string;
            packageName: string;
            expiresAt: Date;
            daysRemaining: number | null;
            status: string;
        } | null;
        pendingCount: number;
    }>;
    getCafe(req: any): Promise<import("../cafes/entities/cafe.entity").Cafe | null>;
    createCafe(req: any, dto: CreateOwnerCafeDto): Promise<import("../cafes/entities/cafe.entity").Cafe>;
    updateCafe(req: any, dto: UpdateCafeDto): Promise<import("../cafes/entities/cafe.entity").Cafe>;
    updateMenus(req: any, dto: UpdateMenusDto): Promise<import("../menus/entities/cafe-menu.entity").CafeMenu[]>;
}
