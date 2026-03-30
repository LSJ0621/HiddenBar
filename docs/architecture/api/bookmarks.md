# 북마크 API (SPEC-02)

> 관련 문서: [공통 규칙](./common.md) · [DB: 북마크](../database.md) · [테스트: 북마크](../../testing/scenarios/bookmarks.md)

---

#### 1.1 PUT `/api/v1/bars/:id/bookmark` — 북마크 추가

> 인증 필요: `Cookie: accessToken`

북마크를 추가한다. 이미 북마크한 경우에도 동일한 응답을 반환한다 (멱등).

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |

**Response** — `200 OK`

```json
{
  "isBookmarked": true,
  "bookmarkCount": 42
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |
| 404 | 존재하지 않는 바 (APPROVED 상태만 대상) |

---

#### 1.2 DELETE `/api/v1/bars/:id/bookmark` — 북마크 제거

> 인증 필요: `Cookie: accessToken`

북마크를 제거한다. 이미 북마크가 없는 경우에도 동일한 응답을 반환한다 (멱등).

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 가게 ID |

**Response** — `200 OK`

```json
{
  "isBookmarked": false,
  "bookmarkCount": 41
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 미인증 |

---

#### 1.3 GET `/api/v1/users/me/bookmarks` — 내 북마크 목록

> 인증 필요: `Cookie: accessToken`

**Response** — `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "name": "The Secret Bar",
      "city": "Bangkok",
      "country": "Thailand",
      "thumbnail": "https://s3.../...",
      "bookmarkCount": 42,
      "averageRating": 4.2,
      "reviewCount": 17,
      "bookmarkedAt": "2026-01-15T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 10,
    "totalPages": 1
  }
}
```
