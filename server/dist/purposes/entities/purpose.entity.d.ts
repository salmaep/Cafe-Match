import { PurposeRequirement } from './purpose-requirement.entity';
export declare class Purpose {
    id: number;
    slug: string;
    name: string;
    description: string;
    icon: string;
    displayOrder: number;
    requirements: PurposeRequirement[];
}
