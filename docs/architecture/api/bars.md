# 가게(술집) API (SPEC-02 + SPEC-04 nearby)

> 관련 문서: [공통 규칙](./common.md) · [DB: 가게](../database/bars.md) · [테스트: 가게](../../testing/scenarios/bars.md)

---

#### 1.1 POST `/api/v1/bars` — 가게 등록

> 인증 필요: `Cookie: accessToken`

**Request DTO**

```typescript
class CreateBarDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MaxLength(255)
  address: string;

  @IsString()
  @MaxLength(50)
  city: string;

  @IsString()
  @MaxLength(50)
  country: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemDto)
  menuItems?: CreateMenuItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOperatingHoursDto)
  operatingHours?: CreateOperatingHoursDto[];
}

class CreateMenuItemDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

class CreateOperatingHoursDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  openTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  closeTime: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
```

**Enum 참조**

```typescript
enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}
```

**Response** — `201 Created`

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
  "phone": null,
  "website": null,
  "status": "PENDING",
  "owner": { "id": 1, "name": "..." },
  "photos": [],
  "menuItems": [
    {
      "id": 1,
      "name": "Old Fashioned",
      "description": "Classic cocktail",
      "price": 15.0,
      "currency": "USD"
    }
  ],
  "operatingHours": [
    {
      "id": 1,
      "dayOfWeek": "MON",
      "openTime": "18:00",
      "closeTime": "02:00",
      "isClosed": false
    }
  ],
  "isBookmarked": false,
  "bookmarkCount": 0,
  "averageRating": 0,
  "reviewCount": 0,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 유효성 검증 실패 |
| 401 | 미인증 |

---

#### 1.2 GET `/api/v1/bars/:id` — 가게 상세 조회

> 인증 필요: `Cookie: accessToken`

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |

**Response** — `200 OK`

Bar 전체 정보 (owner, photos, menuItems, operatingHours 포함). 인증된 유저의 경우 `isBookmarked` 필드 추가.

```json
{
  "id": 1,
  "name": "The Secret Bar",
  "description": "A hidden gem in the heart of Bangkok...",
  "address": "123 Sukhumvit Rd",
  "city": "Bangkok",
  "country": "Thailand",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "phone": "+66-2-123-4567",
  "website": "https://thesecretbar.com",
  "status": "APPROVED",
  "owner": { "id": 1, "name": "barowner" },
  "photos": [
    { "id": 1, "url": "https://s3.../...", "order": 0 },
    { "id": 2, "url": "https://s3.../...", "order": 1 }
  ],
  "menuItems": [
    { "id": 1, "name": "Old Fashioned", "description": "...", "price": 15.0, "currency": "USD" }
  ],
  "operatingHours": [
    { "id": 1, "dayOfWeek": "MON", "openTime": "18:00", "closeTime": "02:00", "isClosed": false }
  ],
  "isBookmarked": true,
  "bookmarkCount": 42,
  "averageRating": 4.2,
  "reviewCount": 17,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |
| 404 | 존재하지 않는 바, 또는 `status`가 APPROVED가 아닌 경우 (소유자/관리자 제외) |

---

#### 1.3 PATCH `/api/v1/bars/:id` — 가게 정보 수정

> 인증 필요: `Cookie: accessToken` (소유자만)

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |

**Request DTO** — `CreateBarDto`의 모든 필드를 Optional로 변환 (`PartialType`)

```typescript
class UpdateBarDto extends PartialType(CreateBarDto) {}
```

수정 시 `status`는 자동으로 `PENDING`으로 변경되어 재승인 필요.

`menuItems` 또는 `operatingHours`가 DTO에 포함된 경우, 기존 항목을 모두 삭제한 뒤 새 항목으로 교체한다 (트랜잭션 처리).

**Response** — `200 OK`

Bar 전체 정보 (1.2 응답과 동일 구조)

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 유효성 검증 실패 |
| 401 | 미인증 |
| 403 | 소유자가 아닌 유저 |
| 404 | 존재하지 않는 바 |

---

#### 1.4 DELETE `/api/v1/bars/:id` — 가게 삭제

> 인증 필요: `Cookie: accessToken` (소유자만)

소프트 삭제 — `deletedAt` 타임스탬프 설정. 연관 레코드(bar_photos, menu_items, operating_hours, bookmarks)도 cascade soft delete.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |

**Response** — `204 No Content`

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |
| 403 | 소유자가 아닌 유저 |
| 404 | 존재하지 않는 바 |

---

#### 1.5 GET `/api/v1/bars/my` — 내가 등록한 가게 목록

> 인증 필요: `Cookie: accessToken`

**Query DTO**

```typescript
class MyBarsQueryDto {
  @IsOptional()
  @IsEnum(BarStatus)
  status?: BarStatus;

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
enum BarStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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
      "thumbnail": "https://s3.../...",
      "createdAt": "2026-01-01T00:00:00Z"
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

---

#### 1.6 POST `/api/v1/bars/:id/photos` — 사진 업로드

> 인증 필요: `Cookie: accessToken` (소유자만)

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |

**Request** — `multipart/form-data`

| 필드 | 타입 | 제한 | 설명 |
|------|------|------|------|
| files | File[] | 최대 5개 | 이미지 파일 (JPEG, PNG, WebP) |

- 파일 당 최대 5MB
- 기존 + 신규 합계 최대 5개

**Response** — `201 Created`

```json
{
  "photos": [
    { "id": 1, "url": "https://s3.../...", "order": 0 },
    { "id": 2, "url": "https://s3.../...", "order": 1 }
  ],
  "failedCount": 0
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `photos` | `array` | 업로드 성공한 사진 목록 |
| `failedCount` | `number` | S3 업로드 실패한 파일 수 (부분 성공 가능) |

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 파일 형식 또는 크기 초과, 총 사진 수 5개 초과 |
| 401 | 미인증 |
| 403 | 소유자가 아닌 유저 |
| 404 | 존재하지 않는 바 |

---

#### 1.7 DELETE `/api/v1/bars/:id/photos/:photoId` — 사진 삭제

> 인증 필요: `Cookie: accessToken` (소유자만)

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |
| photoId | number | 사진 ID |

**Response** — `204 No Content`

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |
| 403 | 소유자가 아닌 유저 |
| 404 | 존재하지 않는 바 또는 사진 |

---

#### 1.8 GET `/api/v1/bars/nearby` — 근처 바 검색

> 인증 필요: `Cookie: accessToken`

> Rate Limit 적용: 사용자 기준 10회/분 (`UserThrottlerGuard`).

> **구현 참고**: PostGIS `ST_DWithin` / `ST_Distance` 기반 공간 검색을 사용한다. `bars.location` geography(Point, 4326) 컬럼의 GIST 인덱스로 성능을 확보하며, 기존 `latitude`/`longitude` float 컬럼은 하위 호환성을 위해 유지된다.

검색 화면에서 현재 위치 기준 주변 바를 자동 추천하는 용도다.

**Query DTO**

```typescript
class NearbyBarsDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;               // 유저 현재 위도

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;               // 유저 현재 경도

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm?: number = 5;     // 검색 반경 (km), 기본 5km, 최대 50km

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

**Response** — `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "name": "The Secret Bar",
      "address": "123 Sukhumvit Rd",
      "city": "Bangkok",
      "latitude": 13.7563,
      "longitude": 100.5018,
      "thumbnail": "https://...",
      "distanceKm": 0.8,
      "averageRating": 4.2,
      "reviewCount": 17
    }
  ],
  "center": {
    "lat": 13.7500,
    "lng": 100.5000
  },
  "radiusKm": 5
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 좌표 범위 초과, 반경 범위 초과 |
