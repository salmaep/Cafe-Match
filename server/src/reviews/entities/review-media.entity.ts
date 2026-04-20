import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Review } from './review.entity';

@Entity('review_media')
export class ReviewMedia {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'review_id', unsigned: true })
  reviewId: number;

  @Column({ name: 'media_type', type: 'enum', enum: ['photo', 'video'] })
  mediaType: 'photo' | 'video';

  @Column({ length: 1000 })
  url: string;

  @Column({ name: 'display_order', type: 'smallint', unsigned: true, default: 0 })
  displayOrder: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review: Review;
}
