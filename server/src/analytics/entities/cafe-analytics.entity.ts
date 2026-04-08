import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Cafe } from '../../cafes/entities/cafe.entity';

@Entity('cafe_analytics')
export class CafeAnalytics {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'cafe_id', type: 'int', unsigned: true })
  cafeId: number;

  @Column({ name: 'promotion_id', type: 'int', unsigned: true, nullable: true })
  promotionId: number;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: ['view', 'click'],
  })
  eventType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Cafe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;
}
