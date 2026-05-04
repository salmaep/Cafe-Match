import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';
import { ReviewRating } from './review-rating.entity';
import { ReviewMedia } from './review-media.entity';

@Entity('reviews')
@Index('idx_review_user_cafe', ['userId', 'cafeId'], { unique: true })
export class Review {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'user_id', unsigned: true })
  userId: number;

  @Column({ name: 'cafe_id', unsigned: true })
  cafeId: number;

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Cafe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;

  @OneToMany(() => ReviewRating, (r) => r.review, { cascade: true, eager: true })
  ratings: ReviewRating[];

  @OneToMany(() => ReviewMedia, (m) => m.review, { cascade: true, eager: true })
  media: ReviewMedia[];
}
