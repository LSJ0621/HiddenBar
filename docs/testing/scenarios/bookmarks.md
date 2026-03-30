# 북마크 E2E 시나리오

## 백엔드 API E2E

### 북마크 추가 (`PUT /api/v1/bars/:id/bookmark`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 미북마크 바 → 추가 | 200 + `{ isBookmarked: true, bookmarkCount: N }` | ✅ |
| 2 | 이미 북마크된 바 → 재호출 (멱등) | 200 + `{ isBookmarked: true, bookmarkCount: N }` | ✅ |
| 3 | 미인증 요청 | 401 Unauthorized | ✅ |
| 4 | 존재하지 않는 바 ID | 404 Not Found | ✅ |
| 5 | PENDING 바 (비승인) 북마크 시도 | 404 Not Found | ✅ |
| 6 | REJECTED 바 북마크 시도 | 404 Not Found | ✅ |
| 7 | 소프트 삭제된 바 북마크 시도 | 404 Not Found | ✅ |

### 북마크 제거 (`DELETE /api/v1/bars/:id/bookmark`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 북마크된 바 → 제거 | 200 + `{ isBookmarked: false, bookmarkCount: N }` | ✅ |
| 2 | 북마크 없는 바 → 재호출 (멱등) | 200 + `{ isBookmarked: false, bookmarkCount: N }` | ✅ |
| 3 | 미인증 요청 | 401 Unauthorized | ✅ |

### 북마크 목록 (`GET /api/v1/users/me/bookmarks`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 북마크 목록 조회 | 200 + items[]{bar} + meta | ✅ |
| 2 | 미인증 요청 | 401 Unauthorized | ✅ |
| 3 | 페이지네이션: `?page=1&limit=5` | 올바른 meta (totalItems, totalPages) | ✅ |
| 4 | 정렬: bookmarkedAt DESC | 최근 북마크가 먼저 | ✅ |
| 5 | 북마크 없는 유저 | 200 + items: [] + meta | ✅ |
| 6 | 소프트 삭제된 바 미포함 | 삭제된 바는 목록에서 제외 | ✅ |

### 바 상세 `isBookmarked` 필드

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 인증 유저 + 북마크한 바 조회 | `isBookmarked: true` | ✅ |
| 2 | 인증 유저 + 미북마크 바 조회 | `isBookmarked: false` | ✅ |
| 3 | 미인증 유저 바 조회 | 401 Unauthorized (바 상세 조회 인증 필수) | ✅ |

---

## 프론트엔드 브라우저 E2E

### 북마크 페이지 (`/bookmarks`)

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | 목록 표시 | `bookmark-list` 내 바 카드 (이름, 평점, 도시/국가, bookmarkedAt) 표시 |
| 2 | 바 카드 클릭 | `/bars/[id]`로 이동 |
| 3 | 빈 상태 | 북마크 없음 → EmptyState (아이콘 + "No bookmarked bars yet" + 검색 CTA 버튼). 별도 `bookmark-empty-state` testid 없음 |
| 4 | 페이지네이션 | `bookmark-pagination` + 페이지 전환 |

### 바 카드에서 북마크 토글

> 북마크 버튼의 testid는 `bar-card-bookmark-{barId}` 형식이며, 바 상세 전용 testid(`bar-detail-bookmark`)는 존재하지 않는다.

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | 북마크 추가 | `bar-card-bookmark-{barId}` 클릭 → 아이콘 fill + 카운트 +1 |
| 2 | 북마크 해제 | 재클릭 → 아이콘 unfill + 카운트 -1 |
| 3 | 옵티미스틱 업데이트 | 클릭 즉시 UI 반영 (API 응답 전) |

### 검색 결과에서 북마크 토글

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | 인증 유저 | `bar-card-bookmark-{id}` 클릭 → 아이콘 토글 |
| 2 | 미인증 유저 | 클릭 → `/login` 리다이렉트 |

### 북마크 페이지에서 제거

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | 언북마크 | 북마크 버튼 클릭 → 카드 사라짐 (옵티미스틱) |
| 2 | 로딩 | 언북마크 중 카드 opacity 0.5 + 스피너 |

### 인증 보호

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | 미인증 유저 `/bookmarks` 접근 | `/login` 리다이렉트 |
