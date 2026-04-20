import { User } from '../../users/entities/user.entity';
export declare class UserRecap {
    id: number;
    userId: number;
    year: number;
    recapData: any;
    generatedAt: Date;
    user: User;
}
