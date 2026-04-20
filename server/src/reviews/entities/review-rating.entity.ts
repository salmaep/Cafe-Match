import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Review } from './review.entity';

@Entity('review_ratings')
@Index('idx_rating_review_cat', ['reviewId', 'category'], { unique: true })
export class ReviewRating {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'review_id', unsigned: true })
  reviewId: number;

  @Column({ length: 50 })
  category: string;

  @Column({ type: 'tinyint', unsigned: true })
  score: number;

  @ManyToOne(() => Review, (r) => r.ratings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review: Review;
}
