import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { User } from '../../users/entities/user.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'promotion_id', type: 'int', unsigned: true })
  promotionId: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @Column({ name: 'midtrans_order_id', length: 100, unique: true })
  midtransOrderId: string;

  @Column({ name: 'midtrans_transaction_id', length: 100, nullable: true })
  midtransTransactionId: string;

  @Column({ name: 'midtrans_snap_token', length: 255, nullable: true })
  midtransSnapToken: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending',
  })
  status: string;

  @Column({ name: 'payment_type', length: 50, nullable: true })
  paymentType: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'raw_notification', type: 'json', nullable: true })
  rawNotification: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Promotion)
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
