import { Cafe } from '../../cafes/entities/cafe.entity';
export declare class CafeMenu {
    id: number;
    cafeId: number;
    category: string;
    itemName: string;
    price: number;
    description: string;
    isAvailable: boolean;
    deletedAt: Date | null;
    cafe: Cafe;
}
