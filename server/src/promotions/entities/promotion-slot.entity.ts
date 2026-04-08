import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AdvertisementPackage } from './advertisement-package.entity';

@Entity('promotion_slots')
export class PromotionSlot {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'package_id', type: 'int', unsigned: true })
  packageId: number;

  @Column({
    name: 'promotion_type',
    type: 'enum',
    enum: ['new_cafe', 'featured_promo'],
  })
  promotionType: string;

  @Column({ length: 7 })
  month: string; // YYYY-MM

  @Column({ name: 'total_slots', type: 'int', unsigned: true })
  totalSlots: number;

  @Column({ name: 'used_slots', type: 'int', unsigned: true, default: 0 })
  usedSlots: number;

  @Column({ name: 'reserved_slots', type: 'int', unsigned: true, default: 0 })
  reservedSlots: number;

  @ManyToOne(() => AdvertisementPackage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: AdvertisementPackage;
}
