import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';

@Entity('user_streaks')
@Index('idx_streak_user_cafe', ['userId', 'cafeId', 'streakType'], { unique: true })
export class UserStreak {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'user_id', unsigned: true })
  userId: number;

  @Column({ name: 'cafe_id', unsigned: true, nullable: true })
  cafeId: number;

  @Column({ name: 'streak_type', type: 'enum', enum: ['cafe', 'global'], default: 'global' })
  streakType: string;

  @Column({ name: 'current_streak', unsigned: true, default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', unsigned: true, default: 0 })
  longestStreak: number;

  @Column({ name: 'last_checkin_date', type: 'date' })
  lastCheckinDate: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Cafe, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;
}
