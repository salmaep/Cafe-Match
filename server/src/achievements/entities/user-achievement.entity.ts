import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Achievement } from './achievement.entity';

@Entity('user_achievements')
@Index('idx_user_achievement', ['userId', 'achievementId'], { unique: true })
export class UserAchievement {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'user_id', unsigned: true })
  userId: number;

  @Column({ name: 'achievement_id', unsigned: true })
  achievementId: number;

  @Column({ unsigned: true, default: 0 })
  progress: number;

  @Column({ name: 'unlocked_at', type: 'timestamp', nullable: true })
  unlockedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Achievement, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'achievement_id' })
  achievement: Achievement;
}
