# 지도 & 길안내 API (SPEC-04)

> 관련 문서: [공통 규칙](./common.md) · [DB: 지도](../database.md) · [테스트: 지도](../../testing/scenarios/maps.md)

> **참고**: `GET /api/v1/bars/nearby` (근처 바 검색)는 [bars.md](./bars.md)에 포함되어 있다.

---

#### 1.1 GET `/api/v1/maps/directions` — 길안내 (Google Routes API v2 프록시)

> 인증 필요: `Cookie: accessToken`

> Rate Limit 적용: 현재 사용자 기준 단일 10회/분.

길안내는 실제 방문 전환을 만드는 핵심 기능이며, 외부 API 비용 통제를 위해 인증 사용자에게만 제공한다. 프론트엔드 기준 경로 탭(`/directions`)에서 호출된다. 프론트엔드 UI 기본값은 TRANSIT이며 호출 시 `mode=TRANSIT`을 명시 전달한다. **API DTO 기본값(`WALKING`)은 변경하지 않는다.** 바 상세 페이지에서는 더 이상 호출하지 않는다.

**Query DTO**

```typescript
class DirectionsDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  originLat: number;         // 출발지 위도

  @IsNumber()
  @Min(-180)
  @Max(180)
  originLng: number;         // 출발지 경도

  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat: number;           // 목적지 위도

  @IsNumber()
  @Min(-180)
  @Max(180)
  destLng: number;           // 목적지 경도

  @IsOptional()
  @IsEnum(TravelMode)
  mode?: TravelMode = TravelMode.WALKING;
}

enum TravelMode {
  WALKING = 'WALKING',
  TRANSIT = 'TRANSIT',
  DRIVING = 'DRIVING',
}
```

**Response** — `200 OK`

```json
{
  "routes": [
    {
      "summary": "",
      "distance": { "text": "1.2 km", "value": 1200 },
      "duration": { "text": "15 mins", "value": 900 },
      "steps": [
        {
          "instruction": "Head north on Soi 11",
          "distance": { "text": "200 m", "value": 200 },
          "duration": { "text": "3 mins", "value": 180 },
          "startLocation": { "lat": 13.7500, "lng": 100.5000 },
          "endLocation": { "lat": 13.7520, "lng": 100.5000 },
          "travelMode": "WALKING",
          "polylines": ["encoded_step_polyline"],
          "transitDetails": null
        }
      ],
      "overviewPolyline": "encoded_polyline_string",
      "startAddress": "",
      "endAddress": ""
    }
  ]
}
```

> `summary`, `startAddress`, `endAddress`는 Google Routes API v2가 해당 필드를 제공하지 않기 때문에 항상 빈 문자열이다. 응답 구조 호환성을 위해 필드는 유지한다.

**`transitDetails` 필드** (TRANSIT 모드 step에만 포함)

```json
{
  "transitDetails": {
    "departureStop": "강남역",
    "arrivalStop": "서울역",
    "departureTime": "2026-03-11T09:00:00Z",
    "arrivalTime": "2026-03-11T09:20:00Z",
    "lineName": "2호선",
    "lineShortName": "2",
    "lineColor": "#33A23D",
    "lineTextColor": "#FFFFFF",
    "vehicleType": "SUBWAY",
    "stopCount": 5
  }
}
```

- TRANSIT 모드 요청 시 각 step의 `travelMode`는 `"WALK"` 또는 `"TRANSIT"`
- `transitDetails`는 `travelMode`가 `"TRANSIT"`인 step에만 포함
- `lineColor`, `lineTextColor`는 Google Routes API에서 제공하는 노선 색상 (Hex)
- `vehicleType`: `"BUS"`, `"SUBWAY"`, `"RAIL"` 등
- `polylines`: TRANSIT 모드에서만 포함. 각 step의 encoded polyline 배열. 클라이언트에서 step별 색상 polyline 렌더링에 사용
- **WALK step 병합**: TRANSIT 모드에서 연속된 WALK step은 자동으로 하나로 병합됨. distance/duration 합산, polylines 누적. "도보 0 secs (0 m)" 같은 무의미한 sub-step 제거
- **대안 경로 (Alternative Routes)**: TRANSIT 모드에서는 `routes` 배열에 최대 3개의 대안 경로가 반환됨. WALKING/DRIVING 모드에서는 기존과 동일하게 단일 경로(`routes[0]`)만 반환

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 좌표 범위 초과, 유효하지 않은 travelMode |
| 404 | 경로 없음 (Google API ZERO_RESULTS) |
| 502 | Google Routes API 호출 실패 |
| 503 | Google API 할당량 초과 |

---

#### 1.2 GET `/api/v1/maps/address/search` — 주소 검색 (Google Places API v1 프록시)

> 인증 필요: `Cookie: accessToken`

> Rate Limit 적용: 10회/분 (MapsModule 공통)

바 등록과 인증 사용자 탐색 UX를 지원하는 주소 검색 엔드포인트다.

**Query DTO**

```typescript
class SearchAddressDto {
  @IsString()
  @MinLength(1)
  query: string;           // 검색어

  @IsOptional()
  @IsString()
  language?: string;       // 응답 언어 (예: 'ko')
}
```

**Response** — `200 OK`

```json
{
  "results": [
    {
      "displayName": "강남역 2번 출구",
      "formattedAddress": "서울특별시 강남구 강남대로 396",
      "city": "서울특별시",
      "country": "대한민국",
      "latitude": 37.498095,
      "longitude": 127.027610
    }
  ]
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | query 누락 또는 빈 문자열 |
| 502 | Google Places API 호출 실패 |
| 503 | Google API 할당량 초과 |
