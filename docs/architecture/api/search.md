# 검색 API (SPEC-03)

> 관련 문서: [공통 규칙](./common.md) · [DB: 검색](../database.md) · [테스트: 검색](../../testing/scenarios/search.md)

---

#### 1.1 GET `/api/v1/bars/search` — 바 검색

> 인증 필요: `Cookie: accessToken`

로그인한 사용자가 승인된 바를 찾고 비교하기 위한 검색 엔드포인트다. 홈 화면 `/`만 공개하고, 실제 검색 기능은 인증 이후 제공한다.

검색 모드는 파라미터 조합에 따라 자동 판별된다.

| 모드 | 조건 | 동작 |
|------|------|------|
| `address` (주소만) | `lat` + `lng` 있고 `name` 없음 | 지정 좌표 근처 바 거리순. 5개씩 무한 로드(`offset`) 지원 |
| `name` (이름만) | `name` 있고 `lat`/`lng` 없음 | 이름 매칭 후보 목록 반환. `userLat`/`userLng`가 있으면 가까운 결과 우선 정렬 |
| `combined` (복합) | `lat` + `lng` + `name` 모두 있음 | 지정 좌표 근처에서 이름 후보를 좁혀 반환 |
| 일반 목록 | 위 조건 모두 해당 없음 | `sortBy` 기준 바 목록 (검색 화면 기본 목록) |

**Query DTO**

```typescript
class SearchBarsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;             // 바 이름 검색어 (pg_trgm 퍼지 매칭)

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Validate(LatLngPairValidator)
  lat?: number;              // 검색 기준 위도 (lng와 함께 제공)

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;              // 검색 기준 경도 (lat과 함께 제공)

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  userLat?: number;          // 유저 현재 위치 위도 (이름 검색 결과 정렬 보조)

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  userLng?: number;          // 유저 현재 위치 경도 (이름 검색 결과 정렬 보조)

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm?: number = 5;     // 검색 반경 (km, 주소/복합 모드에서 사용)

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 5;        // 페이지 크기

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;       // 무한 스크롤 offset (주소 모드 더보기에 사용)

  /** 일반 목록 정렬용 (검색 화면 기본 목록). 검색 모드에서는 무시된다. */
  @IsOptional()
  @IsEnum(SearchSortBy)
  sortBy?: SearchSortBy;
}
```

> `lat`과 `lng`은 반드시 쌍으로 제공해야 한다. 한쪽만 제공하면 400 에러가 반환된다.

**Response** — `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "name": "The Secret Bar",
      "address": "123 Sukhumvit Rd",
      "city": "Bangkok",
      "country": "Thailand",
      "latitude": 13.7563,
      "longitude": 100.5018,
      "thumbnail": "https://...",
      "bookmarkCount": 42,
      "isBookmarked": true,
      "averageRating": 4.2,
      "reviewCount": 17,
      "distanceKm": 0.8,
      "similarityScore": 0.75
    }
  ],
  "hasMore": true,
  "mode": "address",
  "center": { "lat": 13.7563, "lng": 100.5018 },
  "radiusKm": 5
}
```

| 필드 | 설명 |
|------|------|
| `items` | 검색 결과 바 목록 |
| `hasMore` | 더 불러올 결과가 있는지 여부 (주소 모드 무한 스크롤에 사용) |
| `mode` | 실행된 검색 모드 (`address` / `name` / `combined` / `general`) |
| `center` | 검색 기준 좌표 (주소/복합 모드에서만 반환) |
| `radiusKm` | 검색 반경 (주소/복합 모드에서만 반환) |
| `items[].isBookmarked` | 현재 유저의 북마크 여부 |
| `items[].averageRating` | `bar_review_stats.ratingAvg` 기반 평균 평점 (리뷰 없으면 0) |
| `items[].reviewCount` | 총 리뷰 수 (리뷰 없으면 0) |
| `items[].distanceKm` | 검색 기준점으로부터의 거리 (주소/이름/복합 모드에서 반환) |
| `items[].similarityScore` | pg_trgm 이름 유사도 점수 (이름/복합 모드에서 반환) |

> 이름 매칭 기준: `similarity(bar.name, name) > 0.2`. pg_trgm 인덱스(`idx_bar_name_trgm`, `idx_bar_address_trgm`)로 성능을 확보한다.

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | `lat`/`lng` 중 하나만 제공 (반드시 쌍으로 제공해야 함) |
