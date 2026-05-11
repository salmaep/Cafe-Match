import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Review } from './review.entity';

@Entity('review_votes')
export class ReviewVote {
  @PrimaryColumn({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @PrimaryColumn({ name: 'review_id', type: 'int', unsigned: true })
  reviewId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review: Review;
}
