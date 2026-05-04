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

@Entity('cafe_menus')
export class CafeMenu {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Index()
  @Column({ name: 'cafe_id', unsigned: true })
  cafeId: number;

  @Column({ length: 100 })
  category: string;

  @Column({ name: 'item_name', length: 255 })
  itemName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Cafe, (cafe) => cafe.menus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;
}
