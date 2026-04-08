import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createPayment(req: any, dto: CreatePaymentDto): Promise<{
        token: string;
        redirectUrl: string;
        orderId: string;
    }>;
    handleWebhook(body: any): Promise<{
        status: string;
    }>;
    getStatus(orderId: string, req: any): Promise<import("./entities/transaction.entity").Transaction>;
}
