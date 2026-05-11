import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Purpose } from './purpose.entity';
import { Feature } from '../../cafes/entities/feature.entity';

@Entity('purpose_requirements')
@Unique(['purpose', 'feature'])
export class PurposeRequirement {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'purpose_id', unsigned: true })
  purposeId: number;

  @Index()
  @Column({ name: 'feature_id', unsigned: true })
  featureId: number;

  @Column({ name: 'is_mandatory', default: false })
  isMandatory: boolean;

  @Column({ type: 'smallint', unsigned: true, default: 1 })
  weight: number;

  @ManyToOne(() => Purpose, (purpose) => purpose.requirements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purpose_id' })
  purpose: Purpose;

  @ManyToOne(() => Feature, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'feature_id' })
  feature: Feature;
}
