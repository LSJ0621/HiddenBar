# 인증 데이터베이스

> 관련 문서: [ERD](./erd.md) · [Enum 정의](./enums.md) · [Soft Delete 정책](./shared-policies.md) · [API: 인증](../api.md) · [테스트: 인증](../../testing/scenarios/auth.md)

---

### 1. users

사용자 정보를 저장하는 핵심 테이블이다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| email | varchar(255) | NOT NULL, UNIQUE | 이메일 주소 |
| passwordHash | varchar(255) | NULLABLE | 비밀번호 해시 (소셜 로그인 시 null) |
| name | varchar(30) | NOT NULL | 이름 |
| profileImage | varchar(255) | NULLABLE | 프로필 이미지 URL |
| role | enum(Role) | NOT NULL, DEFAULT 'USER' | 사용자 역할 |
| isActive | boolean | NOT NULL, DEFAULT true | 활성 상태 |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| updatedAt | timestamp | NOT NULL, AUTO UPDATE | 수정 시각 |
| deletedAt | timestamp | NULLABLE | 소프트 삭제 시각 |

**인덱스**: `email`, `role`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Role } from '@my-project/shared';
import { Account } from './account.entity';
import { Bar } from './bar.entity';
import { Bookmark } from './bookmark.entity';
import { AdminAction } from './admin-action.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 30 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profileImage: string | null;

  @Index()
  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Account, (account) => account.user)
  accounts: Account[];

  @OneToMany(() => Bar, (bar) => bar.owner)
  bars: Bar[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.user)
  bookmarks: Bookmark[];

  @OneToMany(() => AdminAction, (action) => action.admin)
  adminActions: AdminAction[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];
}
```

---

### 2. accounts

OAuth 소셜 로그인 연동 정보를 저장한다. 하나의 유저가 여러 소셜 계정을 연동할 수 있다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| userId | int | NOT NULL, FK(users.id) | 사용자 ID |
| provider | enum(AuthProvider) | NOT NULL | OAuth 제공자 |
| providerAccountId | varchar(255) | NOT NULL | 제공자 측 계정 ID |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| deletedAt | timestamp | NULLABLE | 소프트 삭제 시각 |

**인덱스**: `userId`
**유니크 제약**: `[provider, providerAccountId]`

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
import { AuthProvider } from '@my-project/shared';
import { User } from './user.entity';

@Entity('accounts')
@Unique(['provider', 'providerAccountId'])
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'enum', enum: AuthProvider })
  provider: AuthProvider;

  @Column({ type: 'varchar', length: 255 })
  providerAccountId: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User, (user) => user.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
```

---

### 3. refresh_tokens

JWT Refresh Token을 저장한다. Refresh Token Rotation 방식으로 사용 후 삭제/재발급한다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| token | varchar(500) | NOT NULL, UNIQUE | Refresh Token 값 |
| userId | int | NOT NULL, FK(users.id) | 사용자 ID |
| expiresAt | timestamp | NOT NULL | 만료 시각 |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| deletedAt | timestamp | NULLABLE | 소프트 삭제 시각 |

**인덱스**: `userId`, `expiresAt`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500, unique: true })
  token: string;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
```

---

### 4. email_verifications

이메일 인증 코드를 저장한다. 회원가입 및 비밀번호 재설정 시 발송된 인증 코드를 관리한다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| email | varchar(255) | NOT NULL | 인증 대상 이메일 |
| codeHash | varchar(255) | NOT NULL | 인증 코드 bcrypt 해시 |
| purpose | enum(EmailVerificationPurpose) | NOT NULL | 인증 목적 (SIGNUP / RESET_PASSWORD) |
| expiresAt | timestamp | NOT NULL | 인증 코드 만료 시각 (발송 후 3분) |
| isUsed | boolean | NOT NULL, DEFAULT false | 사용 완료 여부 |
| failCount | int | NOT NULL, DEFAULT 0 | 인증 실패 횟수 (최대 5회) |
| createdAt | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

**인덱스**: `email`

> - 코드 발송 시 동일 email+purpose의 기존 레코드를 삭제하고 새 레코드를 생성한다.
> - soft delete 미적용 — 사용 후 즉시 `isUsed = true`로 표시하며, 별도 정리 정책으로 만료 레코드를 삭제한다.

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { EmailVerificationPurpose } from '../auth/constants/email-verification.constants';

@Entity('email_verifications')
export class EmailVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  codeHash: string;

  @Column({ type: 'enum', enum: EmailVerificationPurpose })
  purpose: EmailVerificationPurpose;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'int', default: 0 })
  failCount: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

## 사용 Enum

- [Role](./enums.md#11-role) — 사용자 역할 (USER, ADMIN)
- [AuthProvider](./enums.md#12-authprovider) — OAuth 연동 제공자 (EMAIL, GOOGLE)
- [EmailVerificationPurpose](./enums.md#110-emailverificationpurpose) — 이메일 인증 코드 용도 (SIGNUP, RESET_PASSWORD)
