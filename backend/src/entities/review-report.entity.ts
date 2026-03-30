import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ReportReason, ReportStatus, ReportResolution } from '@my-project/shared';
import { Review } from './review.entity.js';
import { User } from './user.entity.js';

@Entity('review_reports')
@Unique(['reviewId', 'reporterUserId'])
@Index(['reviewId', 'status'])
@Index(['status', 'createdAt'])
export class ReviewReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  reviewId: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  reporterUserId: number | null;

  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Column({ type: 'enum', enum: ReportResolution, nullable: true })
  resolution: ReportResolution | null;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  processedByAdminId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewId' })
  review: Review;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporterUserId' })
  reporter: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processedByAdminId' })
  processedByAdmin: User;
}
