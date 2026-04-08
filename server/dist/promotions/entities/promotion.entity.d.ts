import { Cafe } from '../../cafes/entities/cafe.entity';
import { AdvertisementPackage } from './advertisement-package.entity';
export declare class Promotion {
    id: number;
    cafeId: number;
    packageId: number;
    type: string;
    billingCycle: string;
    status: string;
    rejectionReason: string;
    contentTitle: string;
    contentDescription: string;
    contentPhotoUrl: string;
    highlightedFacilities: string[];
    startedAt: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    cafe: Cafe;
    package: AdvertisementPackage;
}
