import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('destinations')
export class Destination {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sublabel: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ name: 'display_order', type: 'smallint', unsigned: true, default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: number;
}
