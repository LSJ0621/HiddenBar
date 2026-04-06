# 관리자 데이터베이스

> 관련 문서: [ERD](./erd.md) · [Enum 정의](./enums.md) · [Soft Delete 정책](./shared-policies.md) · [API: 관리자](../api.md) · [테스트: 관리자](../../testing/scenarios/admin.md)

---

### 1. admin_actions

관리자 활동 감사 로그를 저장한다. 가게 승인/거절/삭제, 유저 정지/활성화/역할 변경 등 모든 관리자 액션을 기록한다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| actionType | enum(AdminActionType) | NOT NULL | 액션 타입 |
| targetType | varchar(20) | NOT NULL | 대상 유형 ("BAR" 또는 "USER") |
| targetId | int | NOT NULL | 대상 ID (Bar 또는 User) |
| reason | text | NULLABLE | 사유 |
| metadata | jsonb | NULLABLE | 추가 정보 (예: { fromRole, toRole }) |
| adminId | int | NULLABLE, FK(users.id) | 실행 관리자 ID (onDelete: SET NULL) |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

**인덱스**: `adminId`, `[targetType, targetId]`, `actionType`, `createdAt`

```typescript
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
import { User } from './user.entity';

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
```

## 사용 Enum

- [AdminActionType](./enums.md#15-adminactiontype) — 관리자 감사 로그 액션 타입 (BAR_APPROVED, BAR_REJECTED, BAR_DELETED, USER_SUSPENDED, USER_ACTIVATED, USER_ROLE_CHANGED, REVIEW_HIDDEN, REVIEW_RESTORED, REVIEW_DELETED)
