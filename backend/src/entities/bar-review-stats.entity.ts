import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Bar } from './bar.entity.js';

@Entity('bar_review_stats')
export class BarReviewStats {
  @PrimaryColumn({ type: 'int' })
  barId: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  ratingAvg: number;

  @Column({ type: 'int', default: 0 })
  rating1Count: number;

  @Column({ type: 'int', default: 0 })
  rating2Count: number;

  @Column({ type: 'int', default: 0 })
  rating3Count: number;

  @Column({ type: 'int', default: 0 })
  rating4Count: number;

  @Column({ type: 'int', default: 0 })
  rating5Count: number;

  @Column({ type: 'int', default: 0 })
  ratingSum: number;

  @Column({ type: 'int', default: 0 })
  photoReviewCount: number;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @OneToOne(() => Bar, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barId' })
  bar: Bar;
}
