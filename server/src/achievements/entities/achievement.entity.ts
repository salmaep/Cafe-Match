import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['visit_purpose', 'visit_general', 'social', 'streak', 'special'],
  })
  category: string;

  @Column({
    type: 'enum',
    enum: ['bronze_1', 'bronze_2', 'silver_1', 'silver_2', 'gold_1', 'gold_2', 'platinum'],
  })
  tier: string;

  @Column({ unsigned: true })
  threshold: number;

  @Column({ name: 'purpose_slug', length: 50, nullable: true })
  purposeSlug: string;

  @Column({ name: 'icon_url', length: 500, nullable: true })
  iconUrl: string;
}
