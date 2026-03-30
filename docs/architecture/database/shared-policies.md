# Soft Delete 정책

> 관련 문서: [README](./README.md) · [ERD](./erd.md) · [인증 테이블](./auth.md) · [바 테이블](./bars.md)

---

## 1. Soft Delete 정책

본 프로젝트는 `@DeleteDateColumn()` 기반의 soft delete를 전역적으로 적용한다. TypeORM의 `softDelete()`/`softRemove()` 메서드를 사용하며, `find` 계열 메서드는 `deletedAt IS NULL` 조건을 자동으로 적용한다.

### 1.1 적용 범위

| 엔티티 | Soft Delete 적용 | 비고 |
|--------|:----------------:|------|
| users | ✓ | |
| accounts | ✓ | |
| refresh_tokens | ✓ | |
| bars | ✓ | BarStatus에서 DELETED 제거, deletedAt으로 대체 |
| bar_photos | ✓ | |
| menu_items | ✓ | |
| operating_hours | ✓ | |
| bookmarks | ✓ | |
| admin_actions | ✗ | 감사 로그는 영구 보존 (hard delete도 하지 않음) |
| email_verifications | ✗ | `isUsed` 플래그로 사용 완료 표시, 만료 레코드는 별도 정책으로 삭제 |
| reviews | ✓ | |
| review_photos | ✓ | |
| bar_review_stats | ✗ | soft delete 미적용 — 리뷰 통계는 집계 데이터로 별도 관리 |

### 1.2 Cascade Soft Delete 정책

부모 엔티티가 soft delete되면 하위 엔티티도 연쇄적으로 soft delete된다.

| 부모 엔티티 | Cascade 대상 | 연쇄 효과 |
|------------|-------------|-----------|
| User | accounts, refresh_tokens, bars, bookmarks | User soft delete → 하위 모두 cascade soft delete |
| Bar | bar_photos, menu_items, operating_hours, bookmarks | Bar soft delete → 하위 모두 cascade soft delete |

> **admin_actions**는 cascade soft delete 대상에서 제외된다. 관리자 감사 로그는 참조 대상이 삭제되더라도 영구 보존한다.

### 1.3 구현 방식 — TypeORM Subscriber

TypeORM의 `EventSubscriber`를 사용하여 cascade soft delete를 구현한다.

```typescript
import {
  EventSubscriber,
  EntitySubscriberInterface,
  SoftRemoveEvent,
  DataSource,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Bar } from '../entities/bar.entity';

@EventSubscriber()
export class SoftDeleteCascadeSubscriber implements EntitySubscriberInterface {
  constructor(private dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  async afterSoftRemove(event: SoftRemoveEvent<any>): Promise<void> {
    const entity = event.entity;
    const manager = event.manager;

    if (entity instanceof User) {
      await manager.softDelete('Account', { userId: entity.id });
      await manager.softDelete('RefreshToken', { userId: entity.id });
      await manager.softDelete('Bar', { ownerId: entity.id });
      await manager.softDelete('Bookmark', { userId: entity.id });
    }

    if (entity instanceof Bar) {
      await manager.softDelete('BarPhoto', { barId: entity.id });
      await manager.softDelete('MenuItem', { barId: entity.id });
      await manager.softDelete('OperatingHours', { barId: entity.id });
      await manager.softDelete('Bookmark', { barId: entity.id });
    }
  }
}
```

파일 위치: `backend/src/common/subscribers/soft-delete-cascade.subscriber.ts`
