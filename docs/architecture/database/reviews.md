# 리뷰 데이터베이스

> 관련 문서: [ERD](./erd.md) · [Enum 정의](./enums.md) · [Soft Delete 정책](./shared-policies.md) · [API: 리뷰](../api.md) · [테스트: 리뷰](../../testing/scenarios/bars.md)

---

### 1. reviews

유저가 가게에 작성한 리뷰를 저장한다. 한 유저는 한 가게에 리뷰를 한 건만 작성할 수 있다 (소프트 삭제된 리뷰 제외, partial unique index로 강제).

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| userId | int | NOT NULL, FK(users.id) | 작성자 ID |
| barId | int | NOT NULL, FK(bars.id) | 대상 가게 ID |
| rating | smallint | NOT NULL | 별점 (1~5) |
| content | text | NOT NULL | 리뷰 본문 |
| visitedAt | date | NULLABLE | 방문 날짜 |
| status | enum(ReviewStatus) | NOT NULL, DEFAULT 'PUBLISHED' | 리뷰 상태 |
| photoCount | int | NOT NULL, DEFAULT 0 | 첨부 사진 수 |
| helpfulCount | int | NOT NULL, DEFAULT 0 | 도움이 됐어요 수 |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| updatedAt | timestamp | NOT NULL, AUTO UPDATE | 수정 시각 |
| deletedAt | timestamp | NULLABLE | 소프트 삭제 시각 |

**인덱스**: `userId`, `barId`, `[barId, createdAt]`, `[userId, createdAt]`, `[barId, rating]`
**유니크 제약**: `[userId, barId]` WHERE `deletedAt IS NULL` (partial unique index, Raw SQL로 관리)

공개 가시성 규칙:

- 일반 사용자 공개 조회/집계에는 `status = PUBLISHED`이면서 `deletedAt IS NULL`인 리뷰만 포함한다.
- 바가 `APPROVED` 상태가 아니면 일반 사용자에게 리뷰 목록과 평점 집계를 노출하지 않는다.
- 관리자 조회만 `HIDDEN`, `REPORTED` 상태를 포함할 수 있다.

```typescript
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
} from 'typeorm';
import { ReviewStatus } from '@my-project/shared';
import { User } from './user.entity.js';
import { Bar } from './bar.entity.js';
import { ReviewPhoto } from './review-photo.entity.js';

@Entity('reviews')
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
```

---

### 2. review_photos

리뷰에 첨부된 사진을 저장한다. 한 리뷰에 최대 5장까지 등록 가능하다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| reviewId | int | NOT NULL, FK(reviews.id) | 리뷰 ID |
| url | varchar(500) | NOT NULL | S3 이미지 URL |
| s3Key | varchar(500) | NOT NULL | S3 오브젝트 키 |
| mimeType | varchar(100) | NULLABLE | MIME 타입 |
| sizeBytes | int | NULLABLE | 파일 크기 (bytes) |
| width | int | NULLABLE | 이미지 너비 (px) |
| height | int | NULLABLE | 이미지 높이 (px) |
| sortOrder | int | NOT NULL, DEFAULT 0, CHECK >= 0 | 사진 순서 |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| deletedAt | timestamp | NULLABLE | 소프트 삭제 시각 |

**인덱스**: `[reviewId, sortOrder]`, `[reviewId, deletedAt]`
**유니크 제약**: `[reviewId, sortOrder]` WHERE `deletedAt IS NULL` (partial unique index, Raw SQL로 관리)

운영 규칙:

- 사진은 `sortOrder` 오름차순으로 반환한다.
- 가장 작은 `sortOrder` 사진을 대표 사진으로 사용한다.
- `s3Key`는 soft delete 이후 배치 정리나 스토리지 추적에 사용하므로 `url`과 함께 유지한다.

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
  Check,
} from 'typeorm';
import { Review } from './review.entity.js';

@Entity('review_photos')
@Check('"sort_order" >= 0')
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
```

---

### 3. bar_review_stats

가게별 리뷰 통계를 저장한다. barId가 PK이며 bars 테이블과 1:1 관계이다. 리뷰 생성/수정/삭제 시 트랜잭션 내에서 동기적으로 갱신된다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| barId | int | PK, FK(bars.id) | 가게 ID |
| reviewCount | int | NOT NULL, DEFAULT 0 | 총 리뷰 수 |
| ratingAvg | numeric(3,2) | NOT NULL, DEFAULT 0 | 평균 별점 |
| rating1Count | int | NOT NULL, DEFAULT 0 | 별점 1점 리뷰 수 |
| rating2Count | int | NOT NULL, DEFAULT 0 | 별점 2점 리뷰 수 |
| rating3Count | int | NOT NULL, DEFAULT 0 | 별점 3점 리뷰 수 |
| rating4Count | int | NOT NULL, DEFAULT 0 | 별점 4점 리뷰 수 |
| rating5Count | int | NOT NULL, DEFAULT 0 | 별점 5점 리뷰 수 |
| ratingSum | int | NOT NULL, DEFAULT 0 | 별점 합계 (평균 계산용) |
| photoReviewCount | int | NOT NULL, DEFAULT 0 | 사진이 포함된 리뷰 수 |
| updatedAt | timestamp | NOT NULL, AUTO UPDATE | 통계 갱신 시각 |

```typescript
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

  @OneToOne(() => Bar)
  @JoinColumn({ name: 'barId' })
  bar: Bar;
}
```

## 사용 Enum

- [ReviewStatus](./enums.md#19-reviewstatus) — 리뷰 노출 상태 (PUBLISHED, HIDDEN, REPORTED)
