import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('advertisement_packages')
export class AdvertisementPackage {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ name: 'price_monthly', type: 'decimal', precision: 12, scale: 2 })
  priceMonthly: number;

  @Column({ name: 'price_annual', type: 'decimal', precision: 12, scale: 2 })
  priceAnnual: number;

  @Column({ name: 'monthly_slots', type: 'int', unsigned: true })
  monthlySlots: number;

  @Column({ name: 'annual_reserved_slots', type: 'int', unsigned: true })
  annualReservedSlots: number;

  @Column({ name: 'session_frequency', length: 100 })
  sessionFrequency: string;

  @Column({ name: 'display_order', type: 'smallint', unsigned: true, default: 0 })
  displayOrder: number;

  @Column({ type: 'json', nullable: true })
  benefits: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
