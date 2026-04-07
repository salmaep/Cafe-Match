import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Purpose } from './purpose.entity';

@Entity('purpose_requirements')
@Unique(['purpose', 'facilityKey'])
export class PurposeRequirement {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'purpose_id', unsigned: true })
  purposeId: number;

  @Column({ name: 'facility_key', length: 50 })
  facilityKey: string;

  @Column({ name: 'is_mandatory', default: false })
  isMandatory: boolean;

  @Column({ type: 'smallint', unsigned: true, default: 1 })
  weight: number;

  @ManyToOne(() => Purpose, (purpose) => purpose.requirements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purpose_id' })
  purpose: Purpose;
}
