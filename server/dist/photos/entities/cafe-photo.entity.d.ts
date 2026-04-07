import { Cafe } from '../../cafes/entities/cafe.entity';
export declare class CafePhoto {
    id: number;
    cafeId: number;
    url: string;
    source: string;
    googlePhotoRef: string;
    caption: string;
    displayOrder: number;
    isPrimary: boolean;
    cafe: Cafe;
}
