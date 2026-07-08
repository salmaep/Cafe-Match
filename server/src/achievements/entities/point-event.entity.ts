import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('point_events')
@Index('idx_points_user', ['userId', 'createdAt'])
export class PointEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', unsigned: true })
  userId: number;

  @Column({ name: 'event_type', length: 50 })
  eventType: string;

  @Column({ type: 'int' })
  points: number;

  /** Idempotency key, e.g. 'checkin:123', 'table_squad:45:u7'. Unique (NULLs exempt). */
  @Column({ name: 'dedupe_key', type: 'varchar', length: 120, nullable: true })
  @Index('uq_point_dedupe', { unique: true })
  dedupeKey: string | null;

  @Column({ type: 'json', nullable: true })
  meta: any;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
