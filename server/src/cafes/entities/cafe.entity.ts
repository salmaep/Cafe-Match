import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CafeFacility } from './cafe-facility.entity';
import { CafeMenu } from '../../menus/entities/cafe-menu.entity';
import { CafePhoto } from '../../photos/entities/cafe-photo.entity';
import { Bookmark } from '../../bookmarks/entities/bookmark.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';

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

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

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
