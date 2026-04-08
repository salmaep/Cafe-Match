"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const transaction_entity_1 = require("./entities/transaction.entity");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
const promotions_service_1 = require("../promotions/promotions.service");
const cafe_entity_1 = require("../cafes/entities/cafe.entity");
let PaymentsService = class PaymentsService {
    transactionsRepo;
    promotionsRepo;
    cafesRepo;
    promotionsService;
    configService;
    serverKey;
    isProduction;
    constructor(transactionsRepo, promotionsRepo, cafesRepo, promotionsService, configService) {
        this.transactionsRepo = transactionsRepo;
        this.promotionsRepo = promotionsRepo;
        this.cafesRepo = cafesRepo;
        this.promotionsService = promotionsService;
        this.configService = configService;
        this.serverKey = this.configService.get('MIDTRANS_SERVER_KEY') || 'SB-Mid-server-xxx';
        this.isProduction = this.configService.get('MIDTRANS_IS_PRODUCTION') === 'true';
    }
    get baseUrl() {
        return this.isProduction
            ? 'https://app.midtrans.com/snap/v1'
            : 'https://app.sandbox.midtrans.com/snap/v1';
    }
    async createSnapTransaction(userId, promotionId) {
        const promotion = await this.promotionsRepo.findOne({
            where: { id: promotionId },
            relations: ['package', 'cafe'],
        });
        if (!promotion)
            throw new common_1.NotFoundException('Promotion not found');
        if (promotion.cafe?.ownerId !== userId) {
            throw new common_1.ForbiddenException('Not your promotion');
        }
        if (promotion.status !== 'pending_payment') {
            throw new common_1.BadRequestException('Promotion is not in pending_payment status');
        }
        const amount = promotion.billingCycle === 'annual'
            ? Number(promotion.package.priceAnnual)
            : Number(promotion.package.priceMonthly);
        const orderId = `CAFE-${promotion.id}-${Date.now()}`;
        const authString = Buffer.from(`${this.serverKey}:`).toString('base64');
        const response = await fetch(`${this.baseUrl}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${authString}`,
            },
            body: JSON.stringify({
                transaction_details: {
                    order_id: orderId,
                    gross_amount: amount,
                },
                item_details: [
                    {
                        id: `pkg-${promotion.packageId}`,
                        price: amount,
                        quantity: 1,
                        name: `${promotion.package.name} - ${promotion.type} (${promotion.billingCycle})`,
                    },
                ],
                customer_details: {
                    first_name: promotion.cafe?.name || 'Cafe Owner',
                    email: `owner-${userId}@cafematch.id`,
                },
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new common_1.BadRequestException(`Midtrans error: ${errorBody}`);
        }
        const snapData = await response.json();
        const transaction = this.transactionsRepo.create({
            promotionId: promotion.id,
            userId,
            midtransOrderId: orderId,
            midtransSnapToken: snapData.token,
            amount,
            status: 'pending',
        });
        await this.transactionsRepo.save(transaction);
        return {
            token: snapData.token,
            redirectUrl: snapData.redirect_url,
            orderId,
        };
    }
    async handleWebhookNotification(body) {
        const { order_id, status_code, gross_amount, signature_key, transaction_status, payment_type, transaction_id } = body;
        const expectedSignature = (0, crypto_1.createHash)('sha512')
            .update(`${order_id}${status_code}${gross_amount}${this.serverKey}`)
            .digest('hex');
        if (signature_key !== expectedSignature) {
            throw new common_1.BadRequestException('Invalid signature');
        }
        const transaction = await this.transactionsRepo.findOne({
            where: { midtransOrderId: order_id },
        });
        if (!transaction)
            throw new common_1.NotFoundException('Transaction not found');
        transaction.rawNotification = body;
        transaction.midtransTransactionId = transaction_id;
        transaction.paymentType = payment_type;
        if (transaction_status === 'capture' || transaction_status === 'settlement') {
            transaction.status = 'success';
            transaction.paidAt = new Date();
            await this.transactionsRepo.save(transaction);
            await this.promotionsService.activatePromotion(transaction.promotionId);
        }
        else if (transaction_status === 'deny' ||
            transaction_status === 'cancel' ||
            transaction_status === 'expire') {
            transaction.status = 'failed';
            await this.transactionsRepo.save(transaction);
        }
        else {
            await this.transactionsRepo.save(transaction);
        }
        return { status: 'ok' };
    }
    async getTransactionStatus(orderId, userId) {
        const transaction = await this.transactionsRepo.findOne({
            where: { midtransOrderId: orderId, userId },
            relations: ['promotion'],
        });
        if (!transaction)
            throw new common_1.NotFoundException('Transaction not found');
        return transaction;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __param(1, (0, typeorm_1.InjectRepository)(promotion_entity_1.Promotion)),
    __param(2, (0, typeorm_1.InjectRepository)(cafe_entity_1.Cafe)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        promotions_service_1.PromotionsService,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map