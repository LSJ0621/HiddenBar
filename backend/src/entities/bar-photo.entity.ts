import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Bar } from './bar.entity.js';

@Entity('bar_photos')
export class BarPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Index()
  @Column({ type: 'int' })
  barId: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Bar, (bar) => bar.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barId' })
  bar: Bar;
}
