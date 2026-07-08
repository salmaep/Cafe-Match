import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';

export type TableStatus = 'open' | 'closed' | 'expired';
export type TableGenderRule = 'any' | 'female_only' | 'male_only';

@Entity('cafe_tables')
@Index('idx_table_cafe_status', ['cafeId', 'status', 'expiresAt'])
@Index('idx_table_expiry', ['status', 'expiresAt'])
export class CafeTable {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'host_user_id', unsigned: true })
  hostUserId: number;

  @Column({ name: 'cafe_id', unsigned: true })
  cafeId: number;

  @Column({
    type: 'enum',
    enum: ['open', 'closed', 'expired'],
    default: 'open',
  })
  status: TableStatus;

  /**
   * Race-safety column: equals hostUserId while the table is open, NULL once
   * closed/expired. The UNIQUE index on it (NULLs exempt in MySQL) enforces
   * "one active table per user" atomically at INSERT time — a concurrent
   * second open fails with ER_DUP_ENTRY. Do not replace with a composite
   * index; MySQL has no partial unique indexes.
   */
  @Column({ name: 'host_active', type: 'int', unsigned: true, nullable: true })
  @Index('uq_table_host_active', { unique: true })
  hostActive: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string | null;

  @Column({ name: 'max_guests', type: 'tinyint', unsigned: true, default: 4 })
  maxGuests: number;

  @Column({
    name: 'gender_rule',
    type: 'enum',
    enum: ['any', 'female_only', 'male_only'],
    default: 'any',
  })
  genderRule: TableGenderRule;

  @Column({ name: 'friends_only', default: false })
  friendsOnly: boolean;

  @Column({
    name: 'opened_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  openedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

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

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_user_id' })
  host: User;

  @ManyToOne(() => Cafe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;
}
