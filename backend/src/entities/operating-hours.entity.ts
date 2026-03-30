import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { DayOfWeek } from '@my-project/shared';
import { Bar } from './bar.entity.js';

@Entity('operating_hours')
@Unique(['barId', 'dayOfWeek'])
@Index(['barId'])
export class OperatingHours {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @Column({ type: 'varchar', length: 5 })
  openTime: string;

  @Column({ type: 'varchar', length: 5 })
  closeTime: string;

  @Column({ type: 'boolean', default: false })
  isClosed: boolean;

  @Column({ type: 'int' })
  barId: number;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Bar, (bar) => bar.operatingHours, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barId' })
  bar: Bar;
}
