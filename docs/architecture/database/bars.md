# 바 데이터베이스

> 관련 문서: [ERD](./erd.md) · [Enum 정의](./enums.md) · [Soft Delete 정책](./shared-policies.md) · [API: 바](../api.md) · [테스트: 바](../../testing/scenarios/bars.md)

---

### 1. bars

가게(술집) 정보를 저장하는 핵심 테이블이다. 등록 후 관리자 승인 전까지 PENDING 상태를 유지한다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| name | varchar(100) | NOT NULL | 가게 이름 |
| description | text | NULLABLE | 가게 설명 |
| address | varchar(255) | NOT NULL | 주소 |
| city | varchar(50) | NOT NULL | 도시 |
| country | varchar(50) | NOT NULL | 국가 |
| latitude | float | NOT NULL | 위도 |
| longitude | float | NOT NULL | 경도 |
| location | geography(Point, 4326) | NULLABLE | PostGIS 공간 좌표 (트리거로 lat/lng 동기화) |
| phone | varchar(30) | NULLABLE | 전화번호 |
| website | varchar(255) | NULLABLE | 웹사이트 |
| status | enum(BarStatus) | NOT NULL, DEFAULT 'PENDING' | 등록 상태 |
| ownerId | int | NOT NULL, FK(users.id) | 등록자 ID |
| searchVector | tsvector | NULLABLE | 전문 검색 벡터 (Raw SQL로 관리) |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| updatedAt | timestamp | NOT NULL, AUTO UPDATE | 수정 시각 |
| deletedAt | timestamp | NULLABLE | 소프트 삭제 시각 |

**인덱스**: `ownerId`, `status`, `[city, country]`, `[latitude, longitude]`, `idx_bar_location (GIST)`, `searchVector (GIN)`, `idx_bar_name_trgm (GIN, gin_trgm_ops)`, `idx_bar_address_trgm (GIN, gin_trgm_ops)`

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
import { Point } from 'geojson';
import { BarStatus } from '@my-project/shared';
import { User } from './user.entity';
import { BarPhoto } from './bar-photo.entity';
import { MenuItem } from './menu-item.entity';
import { OperatingHours } from './operating-hours.entity';
import { Bookmark } from './bookmark.entity';

@Entity('bars')
@Index(['city', 'country'])
@Index(['latitude', 'longitude'])
export class Bar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 50 })
  city: string;

  @Column({ type: 'varchar', length: 50 })
  country: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  /**
   * PostGIS geography point. ST_DWithin / ST_Distance 기반 공간 검색에 사용된다.
   * Raw SQL 마이그레이션의 트리거로 latitude/longitude와 자동 동기화된다.
   */
  @Index('idx_bar_location', { synchronize: false })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: Point | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Index()
  @Column({ type: 'enum', enum: BarStatus, default: BarStatus.PENDING })
  status: BarStatus;

  @Index()
  @Column({ type: 'int' })
  ownerId: number;

  /**
   * PostgreSQL tsvector 컬럼.
   * TypeORM에서 직접 관리하지 않으며, Raw SQL 마이그레이션의 트리거로 자동 갱신된다.
   * 쿼리 시 QueryBuilder 또는 Raw SQL을 사용한다.
   */
  @Column({ type: 'tsvector', nullable: true, select: false })
  searchVector: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User, (user) => user.bars)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => BarPhoto, (photo) => photo.bar)
  photos: BarPhoto[];

  @OneToMany(() => MenuItem, (menuItem) => menuItem.bar)
  menuItems: MenuItem[];

  @OneToMany(() => OperatingHours, (hours) => hours.bar)
  operatingHours: OperatingHours[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.bar)
  bookmarks: Bookmark[];

  @OneToMany(() => Review, (review) => review.bar)
  reviews: Review[];

  @OneToOne(() => BarReviewStats, (stats) => stats.bar)
  reviewStats: BarReviewStats;
}
```

---

### 2. bar_photos

가게 사진을 저장한다. 한 가게에 최대 5장까지 등록 가능하다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| url | varchar(500) | NOT NULL | S3 이미지 URL |
| order | int | NOT NULL, DEFAULT 0 | 사진 순서 (0이 썸네일) |
| barId | int | NOT NULL, FK(bars.id) | 가게 ID |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| deletedAt | timestamp | NULLABLE | 소프트 삭제 시각 |

**인덱스**: `barId`

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
} from 'typeorm';
import { Bar } from './bar.entity';

@Entity('bar_photos')
export class BarPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Index()
  @Column({ type: 'int' })
  barId: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Bar, (bar) => bar.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barId' })
  bar: Bar;
}
```

---

### 3. menu_items

가게의 메뉴 항목을 저장한다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| name | varchar(100) | NOT NULL | 메뉴명 |
| description | varchar(255) | NULLABLE | 메뉴 설명 |
| price | float | NOT NULL | 가격 |
| currency | varchar(3) | NOT NULL, DEFAULT 'USD' | 통화 코드 |
| barId | int | NOT NULL, FK(bars.id) | 가게 ID |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| deletedAt | timestamp | NULLABLE | 소프트 삭제 시각 |

**인덱스**: `barId`

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
} from 'typeorm';
import { Bar } from './bar.entity';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'float' })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Index()
  @Column({ type: 'int' })
  barId: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Bar, (bar) => bar.menuItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barId' })
  bar: Bar;
}
```

---

### 4. operating_hours

가게의 요일별 영업시간을 저장한다. 한 가게에 대해 요일은 중복될 수 없다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| dayOfWeek | enum(DayOfWeek) | NOT NULL | 요일 |
| openTime | varchar(5) | NOT NULL | 오픈 시간 ("HH:mm") |
| closeTime | varchar(5) | NOT NULL | 마감 시간 ("HH:mm") |
| isClosed | boolean | NOT NULL, DEFAULT false | 해당 요일 휴무 여부 |
| barId | int | NOT NULL, FK(bars.id) | 가게 ID |
| deletedAt | timestamp | NULLABLE | 소프트 삭제 시각 |

**인덱스**: `barId`
**유니크 제약**: `[barId, dayOfWeek]`

```typescript
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
import { Bar } from './bar.entity';

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
```

## 사용 Enum

- [BarStatus](./enums.md#13-barstatus) — 가게 등록 상태 (PENDING, APPROVED, REJECTED)
- [DayOfWeek](./enums.md#14-dayofweek) — 요일 구분 (MON~SUN)
