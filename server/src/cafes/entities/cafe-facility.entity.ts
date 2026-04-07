import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Cafe } from './cafe.entity';

@Entity('cafe_facilities')
@Unique(['cafe', 'facilityKey'])
export class CafeFacility {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'cafe_id', unsigned: true })
  cafeId: number;

  @Index()
  @Column({ name: 'facility_key', length: 50 })
  facilityKey: string;

  @Column({ name: 'facility_value', length: 255, nullable: true })
  facilityValue: string;

  @ManyToOne(() => Cafe, (cafe) => cafe.facilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;
}
