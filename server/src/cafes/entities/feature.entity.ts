import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Master lookup table for canonical features. Each unique feature name has
 * exactly ONE row here (UNIQUE on `name`). Cafes reference features via
 * `cafe_features.feature_id`; purposes reference via
 * `purpose_requirements.feature_id`.
 */
@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @CreateDateColumn({ name: 'created_at', precision: 6 })
  createdAt: Date;
}
