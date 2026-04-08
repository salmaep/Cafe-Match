import { Promotion } from '../../promotions/entities/promotion.entity';
import { User } from '../../users/entities/user.entity';
export declare class Transaction {
    id: number;
    promotionId: number;
    userId: number;
    midtransOrderId: string;
    midtransTransactionId: string;
    midtransSnapToken: string;
    amount: number;
    status: string;
    paymentType: string;
    paidAt: Date;
    rawNotification: any;
    createdAt: Date;
    updatedAt: Date;
    promotion: Promotion;
    user: User;
}
