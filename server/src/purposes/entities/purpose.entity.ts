import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { PurposeRequirement } from './purpose-requirement.entity';

@Entity('purposes')
export class Purpose {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 50, unique: true })
  slug: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  icon: string;

  @Column({ name: 'display_order', type: 'smallint', unsigned: true, default: 0 })
  displayOrder: number;

  @OneToMany(() => PurposeRequirement, (req) => req.purpose, { cascade: true })
  requirements: PurposeRequirement[];
}
