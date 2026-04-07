import { Purpose } from './purpose.entity';
export declare class PurposeRequirement {
    id: number;
    purposeId: number;
    facilityKey: string;
    isMandatory: boolean;
    weight: number;
    purpose: Purpose;
}
