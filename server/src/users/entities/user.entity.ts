import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Bookmark } from '../../bookmarks/entities/bookmark.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified: boolean;

  @Column({ name: 'two_fa_enabled', default: false })
  twoFaEnabled: boolean;

  // 'local' | 'google' | 'facebook'
  @Column({ length: 20, default: 'local' })
  provider: string;

  @Column({ name: 'provider_id', type: 'varchar', length: 255, nullable: true })
  providerId: string | null;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: ['user', 'admin', 'owner'], default: 'user' })
  role: string;

  @Column({ name: 'friend_code', length: 8, unique: true })
  friendCode: string;

  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Bookmark, (bookmark) => bookmark.user)
  bookmarks: Bookmark[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];
}
