# 리뷰 신고 API (SPEC-07)

> 관련 문서: [공통 규칙](./common.md) · [DB: 리뷰 신고](../database.md) · [테스트: 리뷰 신고](../../testing/scenarios/reviews.md)

---

#### 1.1 POST `/api/v1/reviews/:reviewId/report` — 리뷰 신고 접수

> 인증 필요: `Cookie: accessToken`

동일 리뷰에 대해 동일 사용자는 한 건만 신고할 수 있다 (UNIQUE 제약).

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| reviewId | number | 리뷰 ID |

**Request DTO**

```typescript
class CreateReportDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  detail?: string;
}
```

**Enum 참조**

```typescript
enum ReportReason {
  SPAM = 'SPAM',
  ABUSIVE_OR_HATEFUL = 'ABUSIVE_OR_HATEFUL',
  SEXUAL_OR_OBSCENE = 'SEXUAL_OR_OBSCENE',
  MISINFORMATION = 'MISINFORMATION',
  OTHER = 'OTHER',
}
```

**Response** — `201 Created`

```json
{
  "id": 1,
  "reviewId": 1,
  "reporterUserId": 1,
  "reason": "SPAM",
  "detail": null,
  "status": "PENDING",
  "createdAt": "2026-03-26T00:00:00Z"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 유효성 검증 실패 (reason 값 오류 등) |
| 401 | 미인증 |
| 404 | 존재하지 않는 리뷰 |
| 409 | 동일 리뷰에 대한 중복 신고 |

---

#### 1.2 GET `/api/v1/admin/review-reports` — 신고 목록 조회

> 인증 필요: `Cookie: accessToken` (Admin)

**Query DTO**

```typescript
class ListReportsQueryDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @IsPositive()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
```

**Enum 참조**

```typescript
enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}
```

**Response** — `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "reviewId": 1,
      "reporterUserId": 1,
      "reason": "SPAM",
      "detail": null,
      "status": "PENDING",
      "resolution": null,
      "createdAt": "2026-03-26T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 5,
    "totalPages": 1
  }
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |
| 403 | 관리자가 아닌 유저 |

---

#### 1.3 GET `/api/v1/admin/review-reports/:reportId` — 신고 상세 조회

> 인증 필요: `Cookie: accessToken` (Admin)

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| reportId | number | 신고 ID |

**Response** — `200 OK`

```json
{
  "id": 1,
  "reviewId": 1,
  "reporterUserId": 1,
  "reason": "SPAM",
  "detail": null,
  "status": "PENDING",
  "resolution": null,
  "resolutionNote": null,
  "processedByAdminId": null,
  "processedAt": null,
  "createdAt": "2026-03-26T00:00:00Z",
  "updatedAt": "2026-03-26T00:00:00Z"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |
| 403 | 관리자가 아닌 유저 |
| 404 | 존재하지 않는 신고 |

---

#### 1.4 PATCH `/api/v1/admin/review-reports/:reportId/resolve` — 신고 처리

> 인증 필요: `Cookie: accessToken` (Admin)

관리자가 신고를 처리한다. `action`에 따라 대상 리뷰의 상태가 변경될 수 있다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| reportId | number | 신고 ID |

**Request DTO**

```typescript
class ResolveReportDto {
  @IsEnum(ReportResolution)
  action: ReportResolution;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
```

**Enum 참조**

```typescript
enum ReportResolution {
  RESTORED = 'RESTORED',
  HIDDEN = 'HIDDEN',
  DELETED = 'DELETED',
}
```

**Response** — `200 OK`

```json
{
  "id": 1,
  "reviewId": 1,
  "status": "RESOLVED",
  "resolution": "HIDDEN",
  "resolutionNote": "부적절한 내용 확인",
  "processedByAdminId": 1,
  "processedAt": "2026-03-26T12:00:00Z"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 유효성 검증 실패 (action 값 오류 등) |
| 401 | 미인증 |
| 403 | 관리자가 아닌 유저 |
| 404 | 존재하지 않는 신고 |
