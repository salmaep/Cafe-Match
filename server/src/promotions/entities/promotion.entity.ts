import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Cafe } from '../../cafes/entities/cafe.entity';
import { AdvertisementPackage } from './advertisement-package.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'cafe_id', type: 'int', unsigned: true })
  cafeId: number;

  @Column({ name: 'package_id', type: 'int', unsigned: true })
  packageId: number;

  @Column({
    type: 'enum',
    enum: ['new_cafe', 'featured_promo'],
  })
  type: string;

  @Column({
    name: 'billing_cycle',
    type: 'enum',
    enum: ['monthly', 'annual'],
    default: 'monthly',
  })
  billingCycle: string;

  @Column({
    type: 'enum',
    enum: ['pending_review', 'active', 'rejected', 'expired', 'pending_payment'],
    default: 'pending_payment',
  })
  status: string;

  @Column({ name: 'rejection_reason', length: 500, nullable: true })
  rejectionReason: string;

  @Column({ name: 'content_title', length: 255, nullable: true })
  contentTitle: string;

  @Column({ name: 'content_description', type: 'text', nullable: true })
  contentDescription: string;

  @Column({ name: 'content_photo_url', length: 1000, nullable: true })
  contentPhotoUrl: string;

  @Column({ name: 'highlighted_facilities', type: 'json', nullable: true })
  highlightedFacilities: string[];

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Cafe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;

  @ManyToOne(() => AdvertisementPackage)
  @JoinColumn({ name: 'package_id' })
  package: AdvertisementPackage;
}
