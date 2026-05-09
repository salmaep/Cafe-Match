import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { Cafe } from './cafe.entity';
import { Feature } from './feature.entity';

@Entity('cafe_features')
@Unique(['cafe', 'feature'])
export class CafeFeature {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Index()
  @Column({ name: 'cafe_id', unsigned: true })
  cafeId: number;

  @Index()
  @Column({ name: 'feature_id', unsigned: true })
  featureId: number;

  @Column({
    type: 'enum',
    enum: ['google_scraper', 'manual'],
    default: 'manual',
  })
  source: 'google_scraper' | 'manual';

  @CreateDateColumn({ name: 'created_at', precision: 6 })
  createdAt: Date;

  @ManyToOne(() => Cafe, (cafe) => cafe.features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;

  @ManyToOne(() => Feature, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'feature_id' })
  feature: Feature;
}
