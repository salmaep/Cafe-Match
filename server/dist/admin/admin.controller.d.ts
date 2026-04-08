import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getPendingPromotions(): Promise<import("../promotions/entities/promotion.entity").Promotion[]>;
    approvePromotion(id: number): Promise<import("../promotions/entities/promotion.entity").Promotion>;
    rejectPromotion(id: number, body: {
        reason: string;
    }): Promise<import("../promotions/entities/promotion.entity").Promotion>;
}
