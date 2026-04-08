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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const typeorm_1 = require("typeorm");
const promotion_entity_1 = require("../../promotions/entities/promotion.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let Transaction = class Transaction {
    id;
    promotionId;
    userId;
    midtransOrderId;
    midtransTransactionId;
    midtransSnapToken;
    amount;
    status;
    paymentType;
    paidAt;
    rawNotification;
    createdAt;
    updatedAt;
    promotion;
    user;
};
exports.Transaction = Transaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], Transaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'promotion_id', type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], Transaction.prototype, "promotionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], Transaction.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'midtrans_order_id', length: 100, unique: true }),
    __metadata("design:type", String)
], Transaction.prototype, "midtransOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'midtrans_transaction_id', length: 100, nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "midtransTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'midtrans_snap_token', length: 255, nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "midtransSnapToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Transaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'success', 'failed', 'refunded'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], Transaction.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_type', length: 50, nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "paymentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'paid_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Transaction.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'raw_notification', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Transaction.prototype, "rawNotification", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Transaction.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Transaction.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => promotion_entity_1.Promotion),
    (0, typeorm_1.JoinColumn)({ name: 'promotion_id' }),
    __metadata("design:type", promotion_entity_1.Promotion)
], Transaction.prototype, "promotion", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Transaction.prototype, "user", void 0);
exports.Transaction = Transaction = __decorate([
    (0, typeorm_1.Entity)('transactions')
], Transaction);
//# sourceMappingURL=transaction.entity.js.map