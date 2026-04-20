import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';

@Entity('checkins')
export class Checkin {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'user_id', unsigned: true })
  userId: number;

  @Column({ name: 'cafe_id', unsigned: true })
  cafeId: number;

  @Column({ name: 'check_in_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  checkInAt: Date;

  @Column({ name: 'check_out_at', type: 'timestamp', nullable: true })
  checkOutAt: Date;

  @Column({ name: 'duration_minutes', type: 'smallint', unsigned: true, nullable: true })
  durationMinutes: number;

  @Column({ default: true })
  verified: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Cafe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;
}
