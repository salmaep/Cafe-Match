import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CafeFacility } from './cafe-facility.entity';
import { CafeMenu } from '../../menus/entities/cafe-menu.entity';
import { CafePhoto } from '../../photos/entities/cafe-photo.entity';
import { Bookmark } from '../../bookmarks/entities/bookmark.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { User } from '../../users/entities/user.entity';

@Entity('cafes')
export class Cafe {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 500 })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  // The POINT column is managed via raw SQL in migrations
  // TypeORM doesn't natively support MySQL POINT with SRID

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'google_place_id', length: 255, nullable: true })
  googlePlaceId: string;

  @Column({ name: 'google_maps_url', length: 500, nullable: true })
  googleMapsUrl: string;

  @Column({ name: 'wifi_available', default: false })
  wifiAvailable: boolean;

  @Column({
    name: 'wifi_speed_mbps',
    type: 'smallint',
    unsigned: true,
    nullable: true,
  })
  wifiSpeedMbps: number;

  @Column({ name: 'has_mushola', default: false })
  hasMushola: boolean;

  @Column({ name: 'has_parking', default: false })
  hasParking: boolean;

  @Column({ name: 'google_rating', type: 'decimal', precision: 2, scale: 1, nullable: true })
  googleRating: number;

  @Column({ name: 'total_google_reviews', type: 'int', unsigned: true, nullable: true })
  totalGoogleReviews: number;

  @Column({ length: 500, nullable: true })
  website: string;

  @Column({ name: 'opening_hours', type: 'json', nullable: true })
  openingHours: Record<string, string>;

  @Column({
    name: 'price_range',
    type: 'enum',
    enum: ['$', '$$', '$$$'],
    default: '$$',
  })
  priceRange: string;

  @Column({ name: 'bookmarks_count', unsigned: true, default: 0 })
  bookmarksCount: number;

  @Column({ name: 'favorites_count', unsigned: true, default: 0 })
  favoritesCount: number;

  @Column({ name: 'owner_id', type: 'int', unsigned: true, nullable: true })
  ownerId: number;

  @Column({ name: 'has_active_promotion', default: false })
  hasActivePromotion: boolean;

  @Column({
    name: 'active_promotion_type',
    type: 'enum',
    enum: ['new_cafe', 'featured_promo'],
    nullable: true,
  })
  activePromotionType: string;

  // Rich content for featured_promo (Type B) cafes
  @Column({ name: 'promotion_content', type: 'json', nullable: true })
  promotionContent: {
    title: string;
    description: string;
    validHours?: string;
    validDays?: string;
    promoPhoto?: string;
  } | null;

  // Rich content for new_cafe (Type A) cafes
  @Column({ name: 'new_cafe_content', type: 'json', nullable: true })
  newCafeContent: {
    openingSince: string;
    highlightText: string;
    keunggulan: string[];
    promoOffer?: string;
    promoPhoto?: string;
  } | null;

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Index()
  @Column({ length: 100, nullable: true })
  category: string;

  @Index()
  @Column({ length: 100, nullable: true })
  city: string;

  @Index()
  @Column({ length: 100, nullable: true })
  district: string;

  @Column({ name: 'claimed_by_owner', default: false })
  claimedByOwner: boolean;

  @Column({ name: 'reviews_distribution', type: 'json', nullable: true })
  reviewsDistribution: {
    oneStar: number;
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
  } | null;

  @Column({ name: 'pricing_raw', length: 50, nullable: true })
  pricingRaw: string;

  @Column({ name: 'last_scraped_at', type: 'timestamp', nullable: true })
  lastScrapedAt: Date;

  @Column({ name: 'scraper_source', length: 50, default: 'manual' })
  scraperSource: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => CafeFacility, (facility) => facility.cafe, { cascade: true })
  facilities: CafeFacility[];

  @OneToMany(() => CafeMenu, (menu) => menu.cafe)
  menus: CafeMenu[];

  @OneToMany(() => CafePhoto, (photo) => photo.cafe)
  photos: CafePhoto[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.cafe)
  bookmarks: Bookmark[];

  @OneToMany(() => Favorite, (favorite) => favorite.cafe)
  favorites: Favorite[];

  // Virtual field for search results
  distanceMeters?: number;
  matchScore?: number;
}
