# 북마크 데이터베이스

> 관련 문서: [ERD](./erd.md) · [Enum 정의](./enums.md) · [Soft Delete 정책](./shared-policies.md) · [API: 북마크](../api.md) · [테스트: 북마크](../../testing/scenarios/bookmarks.md)

---

### 1. bookmarks

유저의 가게 북마크를 저장한다. 동일 유저가 같은 가게를 중복 북마크할 수 없다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| userId | int | NOT NULL, FK(users.id) | 사용자 ID |
| barId | int | NOT NULL, FK(bars.id) | 가게 ID |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| deletedAt | timestamp | NULLABLE | 소프트 삭제 시각 |

**유니크 제약**: `[userId, barId]`
**인덱스**: `userId`, `barId`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Bar } from './bar.entity';

@Entity('bookmarks')
@Unique(['userId', 'barId'])
export class Bookmark {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @Index()
  @Column({ type: 'int' })
  barId: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User, (user) => user.bookmarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Bar, (bar) => bar.bookmarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barId' })
  bar: Bar;
}
```

## 사용 Enum

이 테이블은 Enum을 사용하지 않는다.
