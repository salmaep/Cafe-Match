import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';
import { Purpose } from '../../purposes/entities/purpose.entity';

@Entity('cafe_votes')
@Unique(['userId', 'cafeId', 'purposeId'])
export class CafeVote {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @Column({ name: 'cafe_id', type: 'int', unsigned: true })
  cafeId: number;

  @Column({ name: 'purpose_id', type: 'int', unsigned: true })
  purposeId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Cafe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafe_id' })
  cafe: Cafe;

  @ManyToOne(() => Purpose, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purpose_id' })
  purpose: Purpose;
}
