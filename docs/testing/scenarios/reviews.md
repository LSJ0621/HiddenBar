# 리뷰 E2E 시나리오

## 백엔드 API E2E — 리뷰

### 리뷰 생성 (`POST /api/v1/reviews`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 전체 필드 포함 생성 (barId, rating, content, visitedAt) | 201 + status: PUBLISHED + author/photos 포함 | ✅ |
| 2 | visitedAt 없이 생성 | 201 + visitedAt: null | ✅ |
| 3 | rating=1 (하한 경계값) | 201 | ✅ |
| 4 | rating=5 (상한 경계값) | 201 | ✅ |
| 5 | rating=0 (하한 미만) | 400 Bad Request | ✅ |
| 6 | rating=6 (상한 초과) | 400 Bad Request | ✅ |
| 7 | 비정수 rating (예: 3.5) | 400 Bad Request | ✅ |
| 8 | 공백만 있는 content | 400 Bad Request | ✅ |
| 9 | 2000자 초과 content | 400 Bad Request | ✅ |
| 10 | 미래 날짜 visitedAt | 400 Bad Request | ✅ |
| 11 | 잘못된 visitedAt 형식 | 400 Bad Request | ✅ |
| 12 | barId 누락 | 400 Bad Request | ✅ |
| 13 | 미인증 요청 | 401 Unauthorized | ✅ |
| 14 | 존재하지 않는 바 ID | 404 Not Found | ✅ |
| 15 | APPROVED 아닌 바 (PENDING 등) | 404 Not Found | ✅ |
| 16 | 동일 바에 중복 리뷰 | 409 Conflict | ✅ |

### 리뷰 목록 조회 (`GET /api/v1/bars/:barId/reviews`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 리뷰가 있는 바 조회 | 200 + items[] + meta + stats (totalCount, averageRating, distribution) | ✅ |
| 2 | 페이지네이션 `?page=1&limit=N` | 올바른 meta (totalItems, totalPages) | ✅ |
| 3 | 리뷰 없는 바 조회 | 200 + items: [] + meta + stats (totalCount: 0) | ✅ |
| 4 | rating distribution 정합성 | 각 별점별 count 합계 = totalCount | ✅ |
| 5 | 일반 유저: PUBLISHED 리뷰만 노출 | HIDDEN/REPORTED 리뷰 제외 | ✅ |
| 6 | 관리자: 전체 상태 리뷰 조회 | PUBLISHED + HIDDEN + REPORTED 모두 포함 | ✅ |
| 7 | 미인증 요청 | 401 Unauthorized | ✅ |
| 8 | 존재하지 않는 바 ID | 404 Not Found | ✅ |
| 9 | APPROVED 아닌 바 (비소유자/비관리자) | 404 Not Found | ✅ |

### 내 리뷰 조회 (`GET /api/v1/bars/:barId/my-review`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 작성한 리뷰 있음 | 200 + ReviewItem (author, photos 포함) | ✅ |
| 2 | 작성한 리뷰 없음 | 200 + null (NestJS 직렬화: `{}`) | ✅ |
| 3 | 미인증 요청 | 401 Unauthorized | ✅ |

### 리뷰 수정 (`PATCH /api/v1/reviews/:reviewId`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | rating + content 동시 수정 | 200 + 변경된 필드 반영 | ✅ |
| 2 | rating만 수정 | 200 + rating 변경, content 유지 | ✅ |
| 3 | content만 수정 | 200 + content 변경, rating 유지 | ✅ |
| 4 | visitedAt 수정 | 200 + visitedAt 변경 | ✅ |
| 5 | 유효하지 않은 rating | 400 Bad Request | ✅ |
| 6 | 미인증 요청 | 401 Unauthorized | ✅ |
| 7 | 비작성자 수정 시도 | 403 Forbidden | ✅ |
| 8 | 존재하지 않는 리뷰 | 404 Not Found | ✅ |

### 리뷰 삭제 (`DELETE /api/v1/reviews/:reviewId`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 작성자 소프트 삭제 | 204 No Content | ✅ |
| 2 | 연관 사진도 소프트 삭제 | 사진 deletedAt 설정 | ✅ |
| 3 | bar_review_stats 통계 감소 | totalCount, averageRating 갱신 | ✅ |
| 4 | 미인증 요청 | 401 Unauthorized | ✅ |
| 5 | 비작성자 삭제 시도 | 403 Forbidden | ✅ |
| 6 | 존재하지 않는 리뷰 | 404 Not Found | ✅ |

### 리뷰 사진 업로드 (`POST /api/v1/reviews/:reviewId/photos`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 단일 사진 업로드 | 201 + 사진 배열 (url, sortOrder, mimeType 등) | ✅ |
| 2 | 다중 사진 업로드 | 201 + 여러 사진 반환 | ✅ |
| 3 | 기존 + 신규 합계 5개 초과 | 400 Bad Request | ✅ |
| 4 | 비이미지 파일 (예: .txt) | 400 Bad Request | ✅ |
| 5 | 미인증 요청 | 401 Unauthorized | ✅ |
| 6 | 비작성자 업로드 시도 | 403 Forbidden | ✅ |
| 7 | 존재하지 않는 리뷰 | 404 Not Found | ✅ |

### 리뷰 사진 삭제 (`DELETE /api/v1/reviews/:reviewId/photos/:photoId`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 사진 소프트 삭제 | 204 No Content | ✅ |
| 2 | 미인증 요청 | 401 Unauthorized | ✅ |
| 3 | 비작성자 삭제 시도 | 403 Forbidden | ✅ |
| 4 | 존재하지 않는 리뷰 | 404 Not Found | ✅ |
| 5 | 존재하지 않는 사진 | 404 Not Found | ✅ |

---

## 백엔드 API E2E — 관리자 리뷰 관리

### 리뷰 상태 변경 (`PATCH /api/v1/admin/reviews/:reviewId/status`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | PUBLISHED → HIDDEN | 200 + status: HIDDEN | ✅ |
| 2 | HIDDEN → PUBLISHED | 200 + status: PUBLISHED | ✅ |
| 3 | 숨김 시 통계 감소 | totalCount, averageRating 재계산 | ✅ |
| 4 | 복원 시 통계 증가 | totalCount, averageRating 재계산 | ✅ |
| 5 | 동일 상태로 변경 시도 | 409 Conflict | ✅ |
| 6 | 유효하지 않은 status 값 | 400 Bad Request | ✅ |
| 7 | 미인증 요청 | 401 Unauthorized | ✅ |
| 8 | 비관리자 요청 | 403 Forbidden | ✅ |
| 9 | 존재하지 않는 리뷰 | 404 Not Found | ✅ |

### 관리자 리뷰 삭제 (`DELETE /api/v1/admin/reviews/:reviewId`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 관리자 소프트 삭제 | 204 No Content | ✅ |
| 2 | 선택적 reason 포함 삭제 | 204 + reason 기록 | ✅ |
| 3 | reason 500자 초과 | 400 Bad Request | ✅ |
| 4 | 미인증 요청 | 401 Unauthorized | ✅ |
| 5 | 비관리자 요청 | 403 Forbidden | ✅ |
| 6 | 존재하지 않는 리뷰 | 404 Not Found | ✅ |

---

## 백엔드 API E2E — 리뷰 신고

### 신고 접수 (`POST /api/v1/reviews/:reviewId/report`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 정상 신고 (reason: SPAM) | 201 + status: REPORTED | ✅ |
| 2 | detail 포함 신고 | 201 + detail 포함 | ✅ |
| 3 | 미인증 요청 | 401 Unauthorized | ✅ |
| 4 | 본인 리뷰 신고 시도 | 403 Forbidden | ✅ |
| 5 | 존재하지 않는 리뷰 | 404 Not Found | ✅ |
| 6 | HIDDEN 리뷰 | 404 Not Found | ✅ |
| 7 | 동일 리뷰 중복 신고 | 409 Conflict | ✅ |
| 8 | 잘못된 reason enum 값 | 400 Bad Request | ✅ |
| 9 | detail 1000자 초과 | 400 Bad Request | ✅ |

### 관리자 신고 목록 조회 (`GET /api/v1/admin/review-reports`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 전체 목록 조회 | 200 + items[] + meta | ✅ |
| 2 | status=PENDING 필터 | PENDING 상태만 반환 | ✅ |
| 3 | status=RESOLVED 필터 | RESOLVED 상태만 반환 | ✅ |
| 4 | 페이지네이션 `?page=1&limit=1` | 올바른 meta (totalItems, totalPages) | ✅ |
| 5 | 미인증 요청 | 401 Unauthorized | ✅ |
| 6 | 비관리자 요청 | 403 Forbidden | ✅ |

### 관리자 신고 상세 조회 (`GET /api/v1/admin/review-reports/:reportId`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 상세 조회 성공 | 200 + 신고 상세 (reason, status, reporter, review) | ✅ |
| 2 | 미인증 요청 | 401 Unauthorized | ✅ |
| 3 | 비관리자 요청 | 403 Forbidden | ✅ |
| 4 | 존재하지 않는 신고 ID | 404 Not Found | ✅ |

### 관리자 신고 처리 (`PATCH /api/v1/admin/review-reports/:reportId/resolve`)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | RESTORED 처리 → 리뷰 PUBLISHED 복구 | 200 + resolution: RESTORED | ✅ |
| 2 | HIDDEN 처리 → 리뷰 HIDDEN | 200 + resolution: HIDDEN | ✅ |
| 3 | DELETED 처리 → 리뷰 삭제 | 200 + resolution: DELETED | ✅ |
| 4 | note 포함 처리 | 200 + resolutionNote 포함 | ✅ |
| 5 | 잘못된 action enum 값 | 400 Bad Request | ✅ |
| 6 | note 1000자 초과 | 400 Bad Request | ✅ |
| 7 | 미인증 요청 | 401 Unauthorized | ✅ |
| 8 | 비관리자 요청 | 403 Forbidden | ✅ |
| 9 | 존재하지 않는 신고 ID | 404 Not Found | ✅ |
| 10 | 이미 처리된 신고 재처리 | 409 Conflict | ✅ |

### 통합 시나리오 (엔드 투 엔드 플로우)

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 신고 → RESTORE → PUBLISHED (가시성+집계 복원) | 리뷰 목록 노출 + 통계 반영 | ✅ |
| 2 | 신고 → DELETE (리뷰 삭제, report RESOLVED) | 리뷰 soft delete + report status 변경 | ✅ |
| 3 | 중복 신고 방지 (409) | 동일 유저 동일 리뷰 재신고 시 409 | ✅ |
| 4 | 다중 신고 집계 정합성 (중복 차감 방지) | 여러 유저 신고 시 통계 한 번만 감소 | ✅ |
| 5 | 신고된 리뷰 일반 사용자 목록 미포함 | REPORTED 리뷰 목록에서 제외 | ✅ |
| 6 | 신고된 리뷰 일반 사용자 집계 제외 | REPORTED 리뷰 통계에서 제외 | ✅ |
| 7 | 기존 admin API 선처리 후 resolve | 이미 상태 변경된 리뷰도 report 정리 가능 | ✅ |

---

## 프론트엔드 브라우저 E2E

### 바 상세 — 리뷰 섹션

| # | 시나리오 | 검증 항목 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 리뷰 목록 표시 | 리뷰 카드 (작성자, 별점, 내용, 날짜, 사진) 표시 | ✅ |
| 2 | 리뷰 통계 표시 | 평균 평점, 총 리뷰 수, 별점 분포 바 | ✅ |
| 3 | 페이지네이션 | 추가 리뷰 로드 | ✅ |
| 4 | 빈 상태 | 리뷰 없음 안내 | ✅ |
| 5 | 미인증 상태 | 리뷰 작성 버튼 비활성 또는 로그인 유도 | ✅ |

### 리뷰 작성

| # | 시나리오 | 검증 항목 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 작성 모달 열기 | 별점 선택, 내용 입력, visitedAt 필드 노출 | ✅ |
| 2 | 폼 유효성 검증 | 별점 미선택, 내용 빈값 시 에러 메시지 | ✅ |
| 3 | 작성 성공 | 모달 닫힘 + 리뷰 목록에 새 리뷰 반영 | ✅ |
| 4 | 중복 리뷰 | 이미 작성한 바 → 작성 버튼 미노출 또는 비활성 | ✅ |

### 리뷰 수정/삭제

| # | 시나리오 | 검증 항목 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 수정 모달 열기 | 기존 데이터 프리필 | ✅ |
| 2 | 수정 성공 | 모달 닫힘 + 변경 내용 반영 | ✅ |
| 3 | 삭제 확인 | 확인 다이얼로그 → 확인 시 리뷰 제거 | ✅ |
| 4 | 비작성자 | 수정/삭제 메뉴 미노출 | ✅ |

### 리뷰 사진

| # | 시나리오 | 검증 항목 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 사진 그리드 표시 | 리뷰 카드 내 사진 썸네일 | ✅ |
| 2 | 사진 업로드 | 리뷰 작성/수정 시 파일 선택 → 업로드 | ✅ |
| 3 | 사진 5개 제한 | 초과 시 안내 메시지 | ✅ |

### 리뷰 신고

| # | 시나리오 | 검증 항목 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 신고 다이얼로그 열기 | 신고 사유 선택 UI | ✅ |
| 2 | 신고 제출 성공 | 다이얼로그 닫힘 + 성공 알림 | ✅ |
| 3 | 중복 신고 | 409 → 이미 신고됨 알림 | ✅ |
| 4 | 본인 리뷰 | 신고 버튼 미노출 | ✅ |

### 관리자 — 리뷰 관리

| # | 시나리오 | 검증 항목 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 리뷰 신고 목록 | 테이블 렌더링, 상태 필터, 페이지네이션 | ✅ |
| 2 | 신고 상세 | 신고 정보 + 리뷰 정보 표시 | ✅ |
| 3 | 신고 처리 (RESTORED/HIDDEN/DELETED) | 액션 선택 → 처리 → 상태 변경 반영 | ✅ |
| 4 | 리뷰 상태 변경 (바 상세 내) | 관리자 메뉴 → HIDDEN/PUBLISHED 전환 | ✅ |
| 5 | 리뷰 삭제 (바 상세 내) | 관리자 메뉴 → 삭제 확인 → 제거 | ✅ |
| 6 | 비관리자 접근 | 관리자 리뷰 관리 페이지 접근 시 리다이렉트 | ✅ |

---

## 백엔드 단위 테스트 — ReviewStatsService

> 파일: `backend/src/reviews/review-stats.service.spec.ts`

### incrementStats

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | rating 파라미터로 해당 별점 컬럼 증가 | totalCount + 1, ratingN + 1 | ✅ |
| 2 | hasPhotos=true 시 photoReviewCount 증가 | photoReviewCount + 1 | ✅ |
| 3 | hasPhotos=false 시 photoReviewCount 미변경 | photoReviewCount 유지 | ✅ |
| 4 | rating 컬럼명 동적 바인딩 검증 | `rating1`~`rating5` 올바른 컬럼 사용 | ✅ |

### decrementStats

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | rating 파라미터로 해당 별점 컬럼 감소 | totalCount - 1, ratingN - 1 | ✅ |
| 2 | hasPhotos=true 시 photoReviewCount 감소 | photoReviewCount - 1 | ✅ |
| 3 | GREATEST 사용으로 음수 방지 | 0 미만으로 내려가지 않음 | ✅ |

### adjustRating

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | oldRating 컬럼 감소 + newRating 컬럼 증가 | 이전 별점 -1, 새 별점 +1 | ✅ |
| 2 | old/new rating 컬럼명 동적 바인딩 검증 | 올바른 컬럼 사용 | ✅ |

### adjustPhotoReviewCount

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | delta=1 시 photoReviewCount 증가 | photoReviewCount + 1 | ✅ |
| 2 | delta=-1 시 photoReviewCount 감소 | photoReviewCount - 1 (GREATEST 0) | ✅ |

### recalculate

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | PUBLISHED 리뷰만 필터하여 통계 재계산 | status=PUBLISHED 조건 적용 | ✅ |
| 2 | barId 파라미터로 특정 바의 통계만 재계산 | 해당 barId 조건 적용 | ✅ |
