import { Cafe } from '../../cafes/entities/cafe.entity';
export declare class CafeAnalytics {
    id: number;
    cafeId: number;
    promotionId: number;
    eventType: string;
    createdAt: Date;
    cafe: Cafe;
}
