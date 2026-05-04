import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Cafe } from '../../cafes/entities/cafe.entity';

@Entity('cafe_photos')
export class CafePhoto {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Index()
  @Column({ name: 'cafe_id', unsigned: true })
  cafeId: number;

  @Column({ length: 1000 })
  url: string;

  @Column({ type: 'enum', enum: ['manual', 'google'], default: 'manual' })
  source: string;

  @Column({ name: 'google_photo_ref', length: 500, nullable: true })
  googlePhotoRef: string;

  @Column({ length: 255, nullable: true })
  caption: string;

  @Column({ name: 'display_order', type: 'smallint', unsigned: true, default: 0 })
  displayOrder: number;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Cafe, (cafe) => cafe.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;
}
