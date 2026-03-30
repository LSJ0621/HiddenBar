import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { ReviewStatus } from '@my-project/shared';
import { User } from './user.entity.js';
import { Bar } from './bar.entity.js';
import { ReviewPhoto } from './review-photo.entity.js';

@Entity('reviews')
@Check('"rating" >= 1 AND "rating" <= 5')
@Index(['barId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['barId', 'rating'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @Index()
  @Column({ type: 'int' })
  barId: number;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'date', nullable: true })
  visitedAt: string | null;

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PUBLISHED })
  status: ReviewStatus;

  @Column({ type: 'int', default: 0 })
  photoCount: number;

  @Column({ type: 'int', default: 0 })
  helpfulCount: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Bar, (bar) => bar.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barId' })
  bar: Bar;

  @OneToMany(() => ReviewPhoto, (photo) => photo.review)
  photos: ReviewPhoto[];
}
