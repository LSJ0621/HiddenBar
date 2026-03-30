import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Review } from './review.entity.js';

@Entity('review_photos')
@Check('"sortOrder" >= 0')
@Index(['reviewId', 'sortOrder'])
@Index(['reviewId', 'deletedAt'])
export class ReviewPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  reviewId: number;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 500 })
  s3Key: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ type: 'int', nullable: true })
  sizeBytes: number | null;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Review, (review) => review.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewId' })
  review: Review;
}
