# 리뷰 API (SPEC-06)

> 관련 문서: [공통 규칙](./common.md) · [DB: 리뷰](../database/reviews.md) · [테스트: 리뷰](../../testing/scenarios/reviews.md)

---

#### 1.1 POST `/api/v1/reviews` — 리뷰 생성

> 인증 필요: `Cookie: accessToken`

한 유저는 한 가게에 리뷰를 한 건만 작성할 수 있다. 가게는 APPROVED 상태여야 한다.

**Request DTO**

```typescript
class CreateReviewDto {
  @IsInt()
  @IsPositive()
  barId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsDateString()
  visitedAt?: string; // 방문 날짜 (ISO 8601 date, 예: "2026-03-20")
}
```

**Response** — `201 Created`

```json
{
  "id": 1,
  "rating": 4,
  "content": "정말 멋진 바입니다.",
  "visitedAt": "2026-03-15",
  "status": "PUBLISHED",
  "author": {
    "id": 1,
    "name": "사용자명",
    "profileImageUrl": null
  },
  "photos": [],
  "createdAt": "2026-03-20T00:00:00Z",
  "updatedAt": "2026-03-20T00:00:00Z"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 유효성 검증 실패 |
| 401 | 미인증 |
| 404 | 존재하지 않는 바 또는 APPROVED 상태가 아닌 바 |
| 409 | 이미 해당 바에 리뷰를 작성한 경우 |

---

#### 1.2 GET `/api/v1/bars/:barId/reviews` — 바별 리뷰 목록 조회

> 인증 필요: `Cookie: accessToken`

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| barId | number | 가게 ID |

**Query DTO**

```typescript
class ListReviewsQueryDto extends PaginationDto {}
```

- 리뷰 목록은 항상 최신순(`createdAt DESC`)으로 반환된다.

- 관리자: `PUBLISHED`, `HIDDEN`, `REPORTED` 상태 리뷰 조회 가능
- 일반 유저와 바 소유자: `PUBLISHED` 상태 리뷰만 조회

**Response** — `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "rating": 4,
      "content": "정말 멋진 바입니다.",
      "visitedAt": "2026-03-15",
      "status": "PUBLISHED",
      "author": {
        "id": 1,
        "name": "사용자명",
        "profileImageUrl": null
      },
      "photos": [
        { "id": 1, "url": "https://s3.../...", "sortOrder": 0 },
        { "id": 2, "url": "https://s3.../...", "sortOrder": 1 }
      ],
      "createdAt": "2026-03-20T00:00:00Z",
      "updatedAt": "2026-03-20T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 5,
    "totalPages": 1
  },
  "stats": {
    "totalCount": 5,
    "averageRating": 4.2,
    "distribution": [
      { "rating": 1, "count": 0 },
      { "rating": 2, "count": 0 },
      { "rating": 3, "count": 1 },
      { "rating": 4, "count": 3 },
      { "rating": 5, "count": 1 }
    ]
  }
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |
| 404 | 존재하지 않는 바 또는 APPROVED 상태가 아닌 바 (소유자/관리자 제외) |

---

#### 1.3 GET `/api/v1/bars/:barId/my-review` — 내 리뷰 조회

> 인증 필요: `Cookie: accessToken`

현재 유저가 해당 바에 작성한 리뷰를 조회한다. 리뷰가 없으면 `null`을 반환한다. 이 엔드포인트는 작성자 자신의 활성 리뷰만 대상으로 하며, 공개 목록의 가시성 규칙과 별도로 동작한다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| barId | number | 가게 ID |

**Response** — `200 OK`

리뷰가 있는 경우: ReviewItem 객체 (author, photos 포함)
리뷰가 없는 경우: `null`

```json
{
  "id": 1,
  "rating": 4,
  "content": "정말 멋진 바입니다.",
  "visitedAt": "2026-03-15",
  "status": "PUBLISHED",
  "author": {
    "id": 1,
    "name": "사용자명",
    "profileImageUrl": null
  },
  "photos": [],
  "createdAt": "2026-03-20T00:00:00Z",
  "updatedAt": "2026-03-20T00:00:00Z"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |

---

#### 1.4 PATCH `/api/v1/reviews/:reviewId` — 리뷰 수정

> 인증 필요: `Cookie: accessToken` (작성자만)

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| reviewId | number | 리뷰 ID |

**Request DTO** — `CreateReviewDto`에서 `barId` 제외 후 모두 Optional

```typescript
class UpdateReviewDto extends PartialType(OmitType(CreateReviewDto, ['barId'])) {}
// rating, content, visitedAt 중 변경할 필드만 포함
```

별점이 변경된 경우 `bar_review_stats`의 통계가 트랜잭션 내에서 자동 갱신된다. `PUBLISHED` 상태 리뷰만 공개 집계에 반영되며, `HIDDEN` 또는 `REPORTED` 상태 리뷰의 수정은 공개 집계를 증가시키지 않는다.

**Response** — `200 OK`

ReviewItem 객체 (1.1 응답과 동일 구조 — author, photos 포함)

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 유효성 검증 실패 |
| 401 | 미인증 |
| 403 | 작성자가 아닌 유저 |
| 404 | 존재하지 않는 리뷰 |

---

#### 1.5 DELETE `/api/v1/reviews/:reviewId` — 리뷰 삭제

> 인증 필요: `Cookie: accessToken` (작성자만)

소프트 삭제 — `deletedAt` 타임스탬프 설정. 연관 사진도 soft delete. `bar_review_stats` 통계도 갱신된다. 관리자 삭제를 포함한 모든 삭제는 물리 삭제가 아니라 soft delete 정책을 따른다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| reviewId | number | 리뷰 ID |

**Response** — `204 No Content`

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |
| 403 | 작성자가 아닌 유저 |
| 404 | 존재하지 않는 리뷰 |

---

#### 1.6 POST `/api/v1/reviews/:reviewId/photos` — 리뷰 사진 업로드

> 인증 필요: `Cookie: accessToken` (작성자만)

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| reviewId | number | 리뷰 ID |

**Request** — `multipart/form-data`

| 필드 | 타입 | 제한 | 설명 |
|------|------|------|------|
| files | File[] | 최대 5개 | 이미지 파일 (JPEG, PNG, WebP) |

- 파일 당 최대 5MB
- 기존 + 신규 합계 최대 5개
- 사진은 `sortOrder` 오름차순으로 관리하며, 가장 작은 `sortOrder` 사진을 대표 사진으로 본다.
- 공개 집계의 `photoReviewCount`는 `PUBLISHED` 상태의 활성 리뷰가 사진을 1장 이상 가질 때만 증가한다.

**Response** — `201 Created`

```json
[
  {
    "id": 1,
    "reviewId": 1,
    "url": "https://s3.../reviews/1/uuid.jpg",
    "s3Key": "hiddenbar/reviews/1/uuid.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 204800,
    "sortOrder": 0,
    "createdAt": "2026-03-20T00:00:00Z"
  }
]
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 파일 형식 또는 크기 초과, 총 사진 수 5개 초과, 업로드 실패 |
| 401 | 미인증 |
| 403 | 작성자가 아닌 유저 |
| 404 | 존재하지 않는 리뷰 |

---

#### 1.7 DELETE `/api/v1/reviews/:reviewId/photos/:photoId` — 리뷰 사진 삭제

> 인증 필요: `Cookie: accessToken` (작성자만)

소프트 삭제. 마지막 사진 삭제 시 `bar_review_stats.photoReviewCount`가 감소한다. 단, 공개 집계 감소는 `PUBLISHED` 상태의 활성 리뷰에 대해서만 적용한다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| reviewId | number | 리뷰 ID |
| photoId | number | 사진 ID |

**Response** — `204 No Content`

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |
| 403 | 작성자가 아닌 유저 |
| 404 | 존재하지 않는 리뷰 또는 사진 |
