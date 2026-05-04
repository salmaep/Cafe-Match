import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Cafe } from '../../cafes/entities/cafe.entity';

@Entity('cafe_google_reviews')
@Index('uq_google_review_hash', ['cafeId', 'externalHash'], { unique: true })
export class CafeGoogleReview {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Index()
  @Column({ name: 'cafe_id', unsigned: true })
  cafeId: number;

  @Column({ name: 'guest_name', length: 150 })
  guestName: string;

  @Column({ name: 'guest_avatar', type: 'varchar', length: 1000, nullable: true })
  guestAvatar: string | null;

  @Column({ type: 'tinyint', unsigned: true })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'photo_url', type: 'varchar', length: 1000, nullable: true })
  photoUrl: string | null;

  @Column({ name: 'external_hash', type: 'char', length: 64 })
  externalHash: string;

  @Column({ name: 'scraped_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  scrapedAt: Date;

  @ManyToOne(() => Cafe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;
}
