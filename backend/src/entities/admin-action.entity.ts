import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AdminActionType } from '@my-project/shared';
import { User } from './user.entity.js';

@Entity('admin_actions')
@Index(['targetType', 'targetId'])
export class AdminAction {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'enum', enum: AdminActionType })
  actionType: AdminActionType;

  @Column({ type: 'varchar', length: 20 })
  targetType: string;

  @Column({ type: 'int' })
  targetId: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  adminId: number | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.adminActions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'adminId' })
  admin: User;
}
