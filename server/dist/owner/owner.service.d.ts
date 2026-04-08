import { Repository, DataSource } from 'typeorm';
import { Cafe } from '../cafes/entities/cafe.entity';
import { CafeMenu } from '../menus/entities/cafe-menu.entity';
import { CafePhoto } from '../photos/entities/cafe-photo.entity';
import { CafeFacility } from '../cafes/entities/cafe-facility.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { CafeAnalytics } from '../analytics/entities/cafe-analytics.entity';
import { UpdateCafeDto, CreateOwnerCafeDto, UpdateMenuItemDto } from './dto/update-cafe.dto';
export declare class OwnerService {
    private readonly cafesRepo;
    private readonly menusRepo;
    private readonly photosRepo;
    private readonly facilitiesRepo;
    private readonly promotionsRepo;
    private readonly analyticsRepo;
    private readonly dataSource;
    constructor(cafesRepo: Repository<Cafe>, menusRepo: Repository<CafeMenu>, photosRepo: Repository<CafePhoto>, facilitiesRepo: Repository<CafeFacility>, promotionsRepo: Repository<Promotion>, analyticsRepo: Repository<CafeAnalytics>, dataSource: DataSource);
    getOwnerCafe(userId: number): Promise<Cafe | null>;
    createCafe(userId: number, dto: CreateOwnerCafeDto): Promise<Cafe>;
    updateCafe(userId: number, dto: UpdateCafeDto): Promise<Cafe>;
    updateMenus(userId: number, items: UpdateMenuItemDto[]): Promise<CafeMenu[]>;
    getDashboard(userId: number): Promise<{
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
    private requireOwnerCafe;
}
