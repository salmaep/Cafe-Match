import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CafeTable } from './cafe-table.entity';

export type JoinRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'canceled'
  | 'expired';

@Entity('table_join_requests')
@Index('uq_table_request', ['tableId', 'userId'], { unique: true })
@Index('idx_request_user', ['userId', 'status'])
export class TableJoinRequest {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'table_id', unsigned: true })
  tableId: number;

  @Column({ name: 'user_id', unsigned: true })
  userId: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'canceled', 'expired'],
    default: 'pending',
  })
  status: JoinRequestStatus;

  @Column({ type: 'varchar', length: 200, nullable: true })
  message: string | null;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => CafeTable, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'table_id' })
  table: CafeTable;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
