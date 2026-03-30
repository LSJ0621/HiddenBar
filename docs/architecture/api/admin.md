# 관리자 API (SPEC-05)

> 관련 문서: [공통 규칙](./common.md) · [DB: 관리자](../database.md) · [테스트: 관리자](../../testing/scenarios/admin.md)

> 모든 `/api/v1/admin/*` 엔드포인트는 `Role.ADMIN` 권한 필요.
> 인증: `Cookie: accessToken` (ADMIN 역할)

---

#### 1.1 GET `/api/v1/admin/dashboard` — 대시보드 통계

운영 처리 우선순위를 빠르게 확인하기 위한 관리자 대시보드다. 사업 분석보다 검수와 moderation 상태 파악을 우선한다.

**Response** — `200 OK`

```json
{
  "kpiCards": {
    "totalBars": 500,
    "totalBarsChangeRate": 5.2,
    "pendingBars": 15,
    "avgPendingWaitDays": 2.5,
    "totalUsers": 5000,
    "totalUsersChangeRate": 3.1,
    "totalBookmarks": 1200,
    "totalBookmarksChangeRate": 8.0,
    "reportedReviews": 3
  },
  "barRegistrationTrend": [
    { "date": "2026-03-19", "registered": 3, "reviewed": 2 }
  ],
  "barStatusDistribution": {
    "pending": 15,
    "approved": 450,
    "rejected": 35
  },
  "userSignupTrend": [
    { "date": "2026-03-19", "count": 12 }
  ],
  "topBookmarkedBars": [
    { "barId": 1, "barName": "The Secret Bar", "city": "Bangkok", "bookmarkCount": 42 }
  ],
  "recentPendingBars": [
    {
      "id": 10,
      "name": "New Bar",
      "ownerName": "Alice",
      "photoCount": 3,
      "createdAt": "2026-03-20T09:00:00.000Z"
    }
  ],
  "recentAdminActions": [
    {
      "id": 5,
      "actionType": "BAR_APPROVED",
      "targetType": "BAR",
      "targetId": 9,
      "adminName": "Admin",
      "createdAt": "2026-03-20T08:00:00.000Z"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `kpiCards.totalBars` | `number` | 전체 바 수 |
| `kpiCards.totalBarsChangeRate` | `number` | 전체 바 수 주간 변화율 (%) |
| `kpiCards.pendingBars` | `number` | 대기 중 바 수 |
| `kpiCards.avgPendingWaitDays` | `number` | 대기 중 바의 평균 대기 일수 |
| `kpiCards.totalUsers` | `number` | 전체 유저 수 |
| `kpiCards.totalUsersChangeRate` | `number` | 전체 유저 수 주간 변화율 (%) |
| `kpiCards.totalBookmarks` | `number` | 전체 북마크 수 |
| `kpiCards.totalBookmarksChangeRate` | `number` | 전체 북마크 수 주간 변화율 (%) |
| `kpiCards.reportedReviews` | `number` | REPORTED 상태 리뷰 수 (moderation 대기) |
| `barRegistrationTrend` | `array` | 최근 30일 가게 등록/심사 추이 (`date`, `registered`, `reviewed`) |
| `barStatusDistribution` | `object` | 바 상태별 분포 (`pending` / `approved` / `rejected`) |
| `userSignupTrend` | `array` | 최근 30일 사용자 가입 추이 (`date`, `count`) |
| `topBookmarkedBars` | `array` | 인기 북마크 바 목록 (`barId`, `barName`, `city`, `bookmarkCount`) |
| `recentPendingBars` | `array` | 최근 등록된 PENDING 상태 바 5건 |
| `recentAdminActions` | `array` | 최근 관리자 액션 5건 |

---

#### 1.2 GET `/api/v1/admin/bars` — 가게 목록 (관리자)

**Query DTO**

```typescript
class AdminBarsQueryDto {
  @IsOptional()
  @IsEnum(BarStatus)
  status?: BarStatus;

  @IsOptional()
  @IsString()
  q?: string;                // 이름/주소 검색

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(AdminBarsSortBy)
  sortBy?: AdminBarsSortBy = AdminBarsSortBy.NEWEST;
}

enum AdminBarsSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  NAME = 'name',
}
```

**Response** — `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "name": "The Secret Bar",
      "city": "Bangkok",
      "country": "Thailand",
      "status": "PENDING",
      "owner": { "id": 1, "name": "user1", "email": "user@example.com" },
      "photoCount": 5,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 15,
    "totalPages": 1
  }
}
```

---

#### 1.3 GET `/api/v1/admin/bars/:id` — 가게 상세 (관리자 뷰)

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |

가게 전체 정보 (SPEC-02 상세 조회와 동일) + 관리자 전용 정보 추가.

**Response** — `200 OK`

```json
{
  "id": 1,
  "name": "The Secret Bar",
  "description": "...",
  "address": "...",
  "city": "Bangkok",
  "country": "Thailand",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "phone": "+66-2-123-4567",
  "website": "https://thesecretbar.com",
  "status": "PENDING",
  "owner": { "id": 1, "name": "user1", "email": "user@example.com" },
  "photos": [
    { "id": 1, "url": "https://s3.../...", "order": 0 }
  ],
  "photoCount": 1,
  "thumbnail": "https://s3.../...",
  "menuItems": [...],
  "operatingHours": [...],
  "bookmarkCount": 42,
  "rejectionReason": "사진 불량",
  "createdAt": "2026-01-01T00:00:00Z",
  "admin": {
    "actions": [
      {
        "actionType": "BAR_REJECTED",
        "reason": "사진 불량",
        "admin": { "id": 1, "name": "admin1" },
        "createdAt": "2026-01-02T00:00:00Z"
      }
    ]
  }
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 404 | 존재하지 않는 바 |

---

#### 1.4 PATCH `/api/v1/admin/bars/:id/approve` — 가게 승인

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |

**Request DTO**

```typescript
class ApproveBarDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

**Response** — `200 OK`

```json
{
  "id": 1,
  "status": "APPROVED"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 404 | 존재하지 않는 바 |
| 409 | 이미 APPROVED 상태 |

---

#### 1.5 PATCH `/api/v1/admin/bars/:id/reject` — 가게 거절

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |

**Request DTO**

```typescript
class RejectBarDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;   // 거절 사유 필수
}
```

**Response** — `200 OK`

```json
{
  "id": 1,
  "status": "REJECTED"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 거절 사유 미입력 또는 10자 미만 |
| 404 | 존재하지 않는 바 |
| 409 | 이미 REJECTED 상태 |

---

#### 1.6 DELETE `/api/v1/admin/bars/:id` — 가게 삭제 (관리자)

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |

관리자 삭제 — `deletedAt` 타임스탬프 설정 (soft delete). 연관 레코드(bar_photos, menu_items, operating_hours, bookmarks)도 cascade soft delete.

**Request DTO**

```typescript
class DeleteBarDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

**Response** — `204 No Content`

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 404 | 존재하지 않는 바 |
| 409 | 이미 soft delete된 가게 |

---

#### 1.7 GET `/api/v1/admin/users` — 유저 목록

**Query DTO**

```typescript
class AdminUsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;                // 이메일/이름 검색

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
```

**Enum 참조**

```typescript
enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}
```

**Response** — `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "user1",
      "role": "USER",
      "isActive": true,
      "barCount": 3,
      "bookmarkCount": 15,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 5000,
    "totalPages": 250
  }
}
```

---

#### 1.8 GET `/api/v1/admin/users/:id` — 유저 상세

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 유저 ID |

**Response** — `200 OK`

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "user1",
  "profileImage": "https://...",
  "role": "USER",
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "provider": "EMAIL",
  "barCount": 1,
  "bookmarkCount": 15,
  "bars": [
    { "id": 1, "name": "The Secret Bar", "status": "APPROVED", "city": "Bangkok", "country": "Thailand" }
  ],
  "recentActions": [
    {
      "actionType": "USER_ROLE_CHANGED",
      "reason": "...",
      "createdAt": "2026-01-05T00:00:00Z"
    }
  ]
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 404 | 존재하지 않는 유저 |

---

#### 1.9 PATCH `/api/v1/admin/users/:id/suspend` — 유저 정지

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 유저 ID |

**Request DTO**

```typescript
class SuspendUserDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;   // 정지 사유 필수
}
```

`User.isActive`를 `false`로 변경. 해당 유저의 모든 `RefreshToken` 삭제 (강제 로그아웃).

**Response** — `200 OK`

```json
{
  "id": 1,
  "isActive": false
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 정지 사유 미입력 또는 10자 미만 |
| 403 | 자기 자신을 정지 시도 |
| 404 | 존재하지 않는 유저 |
| 409 | 이미 정지 상태 |

---

#### 1.10 PATCH `/api/v1/admin/users/:id/activate` — 유저 활성화

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 유저 ID |

`User.isActive`를 `true`로 변경.

**Response** — `200 OK`

```json
{
  "id": 1,
  "isActive": true
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 404 | 존재하지 않는 유저 |
| 409 | 이미 활성 상태 |

---

#### 1.11 PATCH `/api/v1/admin/users/:id/role` — 유저 역할 변경

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 유저 ID |

**Request DTO**

```typescript
class ChangeRoleDto {
  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

**Response** — `200 OK`

```json
{
  "id": 1,
  "role": "ADMIN"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 403 | 자기 자신의 역할 변경 시도 |
| 404 | 존재하지 않는 유저 |
| 409 | 이미 동일한 역할 |

---

#### 1.12 GET `/api/v1/admin/actions` — 감사 로그 목록

**Query DTO**

```typescript
class AdminActionsQueryDto {
  @IsOptional()
  @IsEnum(AdminActionType)
  actionType?: AdminActionType;

  @IsOptional()
  @IsInt()
  adminId?: number;

  @IsOptional()
  @IsInt()
  targetId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
```

**Enum 참조**: `AdminActionType` — `./database.md` 섹션 2.6 참조

**Response** — `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "actionType": "BAR_APPROVED",
      "targetType": "BAR",
      "targetId": 1,
      "reason": null,
      "metadata": null,
      "admin": { "id": 1, "name": "admin1" },
      "createdAt": "2026-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "actionType": "USER_ROLE_CHANGED",
      "targetType": "USER",
      "targetId": 1,
      "reason": "관리자 승격",
      "metadata": { "fromRole": "USER", "toRole": "ADMIN" },
      "admin": { "id": 1, "name": "admin1" },
      "createdAt": "2026-01-02T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 500,
    "totalPages": 25
  }
}
```

---

#### 1.13 PATCH `/api/v1/admin/reviews/:reviewId/status` — 리뷰 상태 변경

> 인증 필요: `Cookie: accessToken` (ADMIN 역할)

리뷰의 노출 상태를 변경한다 (PUBLISHED / HIDDEN / REPORTED). 액션 기록이 `admin_actions` 테이블에 저장된다. v1에서 `REPORTED`는 사용자 신고 상태가 아니라, 관리자가 추가 확인이 필요하다고 분류하는 moderation 상태다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| reviewId | number | 리뷰 ID |

**Request DTO**

```typescript
class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus; // 'PUBLISHED' | 'HIDDEN' | 'REPORTED(관리자 검토 필요)'

  @IsOptional()
  @IsString()
  reason?: string;
}
```

**Enum 참조**: `ReviewStatus` — `./database.md` 섹션 2.10 참조

**Response** — `200 OK`

```json
{
  "id": 1,
  "status": "HIDDEN"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 유효하지 않은 status 값 |
| 404 | 존재하지 않는 리뷰 |

---

#### 1.14 DELETE `/api/v1/admin/reviews/:reviewId` — 리뷰 삭제 (관리자)

> 인증 필요: `Cookie: accessToken` (ADMIN 역할)

관리자 권한으로 리뷰를 삭제한다 (soft delete). 리뷰 통계(`bar_review_stats`)도 함께 갱신된다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| reviewId | number | 리뷰 ID |

**Request DTO**

```typescript
class DeleteReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

**Response** — `204 No Content`

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 404 | 존재하지 않는 리뷰 |
