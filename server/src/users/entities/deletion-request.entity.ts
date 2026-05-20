import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('deletion_requests')
export class DeletionRequest {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'friend_code', length: 8, nullable: true })
  friendCode: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'verified', 'processed', 'rejected'],
    default: 'pending',
  })
  status: 'pending' | 'verified' | 'processed' | 'rejected';

  @Column({
    name: 'matched_user_id',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  matchedUserId: number | null;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;
}
