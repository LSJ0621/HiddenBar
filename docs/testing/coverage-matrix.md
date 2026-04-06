# 테스트 커버리지 매트릭스

> 이 문서는 "현재 존재하는 테스트 파일"과 "아직 없는 테스트"를 분리해서 기록한다.

## 1. 현재 존재하는 테스트

### 1.1 백엔드 단위 테스트 (41 suites, 607 tests — 2026-04-06 기준 전체 통과)

| 모듈 | 파일 수 | 커버리지 범위 |
|------|---------|--------------|
| auth | 10 | service, controller, guards, strategy, DTO, OAuth client, password, email |
| bars | 3 | service, controller, bar-owner guard |
| bookmarks | 2 | service, controller |
| search | 2 | service, controller |
| maps | 3 | service, controller, address-search service |
| admin | 3 | service (getDashboard, findBars, approve/reject/delete, user mgmt), controller, admin-reviews service |
| users | 2 | service, controller |
| photos | 2 | service, controller |
| reviews | 3 | service, controller, review-stats service |
| review-reports | 2 | service (submitReport 비즈니스 로직 10 시나리오), controller (POST 신고 접수 9 시나리오 + GET 관리자 목록 조회 3 시나리오 + GET 관리자 상세 조회 1 시나리오 + PATCH 관리자 처리 2 시나리오) |
| common | 6 | configuration, pagination DTO, exception filter, file-validation pipe, origin-validation middleware, user-throttler guard |
| external | 2 | S3 client (18 tests로 보강), Google Places client |
| app | 1 | root controller |

### 1.2 백엔드 E2E 파일 (10 suites)

| 파일 | 현재 확인 가능한 범위 |
|------|----------------------|
| `backend/test/auth.e2e-spec.ts` | 회원가입, 로그인, refresh, 로그아웃, 내 프로필 조회/수정, 비밀번호 변경, 인증 오류 |
| `backend/test/bars.e2e-spec.ts` | 바 생성/상세/수정/삭제, 내 바 목록, 승인 후 상세 조회, 북마크 시나리오 |
| `backend/test/bookmarks.e2e-spec.ts` | 북마크 추가/삭제, 목록 조회(페이지네이션/정렬), 바 상세 isBookmarked, 미인증/미존재/미승인 — 18 시나리오 |
| `backend/test/admin.e2e-spec.ts` | 대시보드, 바 승인/거절, 사용자 정지/활성화/역할 변경, 감사 로그, 관리자 권한 검증 |
| `backend/test/search.e2e-spec.ts` | 이름 검색, 일반/위치 검색, 정렬(거리/이름/평점), 페이지네이션, 미인증 — 16 시나리오 |
| `backend/test/maps.e2e-spec.ts` | 주변 바 검색, 길안내(WALKING/DRIVING/TRANSIT/TWO_WHEELER), 주소 검색, 파라미터 검증, rate limiting — 27 시나리오 |
| `backend/test/profile.e2e-spec.ts` | 프로필 조회/수정, 비밀번호 변경, 프로필 이미지 업로드/삭제, Google 유저, 미인증 — 22 시나리오 |
| `backend/test/soft-delete.e2e-spec.ts` | soft delete 공통 동작 검증 |
| `backend/test/review-reports.e2e-spec.ts` | 신고 접수(9: 성공/유효성/인증/권한/비즈니스), 관리자 목록(6: 조회/필터/페이지네이션/인증), 관리자 상세(4: 조회/인증/404), 관리자 처리(8: HIDDEN/note/유효성/인증/409), 통합 시나리오(7: RESTORE/DELETE/중복/집계/가시성) — 총 34 시나리오 |
| `backend/test/reviews.e2e-spec.ts` | 리뷰 생성(16: 성공/유효성/인증/비즈니스), 리뷰 목록(9: 페이지네이션/통계/가시성), 내 리뷰(3), 리뷰 수정(8), 리뷰 삭제(6: 사진 연쇄/통계), 사진 업로드(7: 다중/제한/파일타입), 사진 삭제(5), 관리자 상태 변경(9: HIDDEN↔PUBLISHED/통계), 관리자 삭제(6) — 총 69 시나리오 |

### 1.3 프론트엔드 단위 테스트 (26 suites — 2026-04-06 기준 전체 통과)

| 파일 | 커버리지 범위 |
|------|--------------|
| `review-card.test.tsx` | 렌더링, 작성자 메뉴, 관리자 액션, 사진 그리드 |
| `review-form-modal.test.tsx` | 생성/수정 모드, 폼 검증, 제출 |
| `review-stats-summary.test.tsx` | 평균 평점, 분포 바, 빈 상태 |
| `review-section.test.tsx` | 인증/미인증, 페이지네이션, 로딩, 빈 상태 |
| `review-report-dialog.test.tsx` | 기본 렌더링, 신고 사유 선택, 신고 제출 (성공/409/에러), Cancel, pending 상태 |
| `report-detail-content.test.tsx` | 로딩, 데이터 없음, 신고/리뷰 정보 렌더링, PENDING resolve 폼, RESOLVED 결과 표시, 뒤로가기, resolve mutation |
| `review-reports-table.test.tsx` | 기본 렌더링, 빈 상태, 로딩, 상태 필터, 행 클릭 네비게이션, 상태 배지 |
| `bar-form.test.tsx` | 멀티스텝 폼 조기 submit 방지, Enter 키 가드, 마지막 단계 submit |
| `login-form.test.tsx` | 폼 렌더링, 로그인 실패 (401/403/기타), 로그인 성공 |
| `reset-password-form.test.tsx` | 이메일 입력, 인증 코드, 비밀번호 재설정 |
| `profile-edit-content.test.tsx` | 폼 필드, 비밀번호 토글 |
| `oauth-google-callback.test.tsx` | CSRF, 에러 파라미터, 인증 플로우 |
| `star-rating.test.tsx` | 표시/인터랙티브, 크기, 접근성 |
| `rating-badge.test.tsx` | 평점, 빈 상태, 크기 |
| `address-search-input.test.tsx` | 입력, 결과 표시, 선택 |
| `use-address-search.test.ts` | 쿼리, API 호출, 에러, 선택 |
| `onboarding-provider.test.tsx` | 초기화 (완료 플래그, 인증, 경로), Start/Skip, 스텝 진행 (next/mapPin/navigation/불일치 무시), End Tour, Complete phase, sessionStorage 유지/복원 |
| `onboarding-overlay.test.tsx` | target 미존재 시 미렌더링, 4-panel Portal 렌더링, pointer-events, data-onboarding 속성, aria-hidden, z-index, 4-panel 위치 계산, highlight 클래스 추가/제거, viewport 밖 target 미렌더링, 타임아웃 시 onRectChange null, OnboardingTargetTracker (null 렌더, rect 추적, highlight 미적용) |
| `onboarding-tooltip.test.tsx` | 메시지 렌더링 (스텝별 텍스트, 진행률), Next 버튼 표시/숨김 (waitFor 조건별), End tour 버튼, tooltip role |
| `onboarding-dialog.test.tsx` | Welcome 다이얼로그 (제목, 버튼, startTour/skipTour 콜백), Complete 다이얼로그 (제목, Done 버튼, endTour 콜백) |

### 1.4 프론트엔드 E2E 파일 (10 suites, 227 tests — 2026-04-06 기준 Playwright)

| 파일 | 현재 확인 가능한 범위 |
|------|----------------------|
| `frontend/e2e/example.spec.ts` | 홈페이지 접근 smoke test |
| `frontend/e2e/auth.spec.ts` | 로그인/로그아웃 |
| `frontend/e2e/bars.spec.ts` | 바 상세, 바 등록/수정 |
| `frontend/e2e/bookmarks.spec.ts` | 북마크 추가/삭제/목록 |
| `frontend/e2e/search.spec.ts` | 검색, 지도 탐색, 길안내 |
| `frontend/e2e/profile.spec.ts` | 프로필 조회/수정 |
| `frontend/e2e/admin.spec.ts` | 관리자 화면 |
| `frontend/e2e/reviews.spec.ts` | 리뷰 작성/수정/삭제, 관리자 리뷰 관리 |
| `frontend/e2e/cross-cutting.spec.ts` | 크로스커팅 관심사 |
| `frontend/e2e/directions.spec.ts` | 길안내 |

## 2. 현재 존재 테스트 기준 커버리지 메모

### 2.1 인증

- 백엔드: 단위(10) + E2E 존재 — 커버리지 양호
- 프론트: OAuth callback 단위 테스트 존재, E2E는 전용 시나리오 파일 없음

### 2.2 바 등록/상세/북마크

- 백엔드: 단위(3+2) + E2E 존재
- 북마크 E2E: `bookmarks.e2e-spec.ts` (18 시나리오) 존재
- 사진 업로드 전용 E2E 파일은 현재 없음
- 프론트 E2E 없음

### 2.3 검색

- 백엔드: 단위(2) + E2E(`search.e2e-spec.ts` — 16 시나리오) 존재
- 프론트 E2E 없음

### 2.4 지도/길안내

- 백엔드: 단위(3) + E2E(`maps.e2e-spec.ts` — 27 시나리오) 존재
- 프론트 E2E 없음
- 길안내 기능은 경로 탭(`/directions`)에서 제공 (이전: 바 상세 사이드바). 프론트 UI 기본 TRANSIT, API 기본 WALKING

### 2.5 관리자

- 백엔드: 단위(3 — service + controller + admin-reviews service) + E2E 존재
- 리뷰 moderation E2E: `reviews.e2e-spec.ts`에서 관리자 상태 변경(9) + 관리자 삭제(6) 커버
- 프론트 E2E 없음

### 2.6 리뷰

- 백엔드: 단위(3 — service + controller + review-stats service) + E2E(`reviews.e2e-spec.ts` — 69 시나리오) 존재
- 시나리오 문서: `docs/testing/scenarios/reviews.md`
- 프론트: 단위(4 — card, form-modal, stats-summary, section) 존재, E2E 없음

### 2.7 프로필

- 백엔드: 단위(2) + E2E(`profile.e2e-spec.ts` — 22 시나리오) 존재
- 프론트: 단위(1 — profile-edit-content) 존재, E2E 없음

### 2.8 리뷰 신고 (review-reports)

- 백엔드: 단위(2 — service + controller) 구현 및 테스트 완료 (2026-03-24 20/20 PASS)
  - `backend/src/review-reports/review-reports.service.spec.ts` — submitReport 비즈니스 로직 (11 시나리오: PUBLISHED 신고, 이미 REPORTED 상태 중복 신고, 본인 리뷰 차단, duplicate key, NotFoundException, HIDDEN 리뷰, soft-deleted 리뷰, detail 정규화, photoCount 기반 hasPhoto, pessimistic lock)
  - `backend/src/review-reports/review-reports.controller.spec.ts` — 4개 엔드포인트 HTTP 흐름 (POST 신고 접수 9 시나리오 + GET 관리자 목록 조회 3 시나리오 + GET 관리자 상세 조회 1 시나리오 + PATCH 관리자 처리 2 시나리오)
- 백엔드 E2E: `backend/test/review-reports.e2e-spec.ts` — 34 시나리오 (신고 접수 9 + 관리자 목록 6 + 관리자 상세 4 + 관리자 처리 8 + 통합 7)
- 시나리오 문서: `docs/testing/scenarios/reviews.md` (리뷰 신고 섹션)
- 프론트: 단위(3 — review-report-dialog, report-detail-content, review-reports-table) 존재, E2E 없음

## 3. 필요한데 아직 없는 테스트

### 3.1 백엔드 E2E 우선 추가 대상

- 바 사진 업로드/삭제 API (`photos` 모듈 전용 E2E 없음)

### 3.2 프론트엔드 E2E 우선 추가 대상

- ~~로그인/로그아웃~~ → `auth.spec.ts` (구현 완료)
- ~~검색 접근 제어 (`/search` 인증 전용)~~ → `search.spec.ts` (구현 완료)
- ~~바 상세 접근 제어 (인증 전용)~~ → `bars.spec.ts` (구현 완료)
- ~~바 등록/수정~~ → `bars.spec.ts` (구현 완료)
- ~~검색/지도 탐색 + 길안내 받기 버튼~~ → `search.spec.ts` (구현 완료)
- ~~북마크~~ → `bookmarks.spec.ts` (구현 완료)
- ~~프로필~~ → `profile.spec.ts` (구현 완료)
- ~~관리자 화면~~ → `admin.spec.ts` (구현 완료)
- ~~리뷰 작성/수정/삭제 및 관리자 리뷰 관리~~ → `reviews.spec.ts` (구현 완료)

## 4. 문서 정합성 기준

- 존재하지 않는 파일을 `TODO`로 표에 섞어 현재 테스트처럼 보이게 적지 않는다.
- "현재 존재"와 "필요하지만 없음"을 분리한다.
- `category` 기반 테스트를 현재형 커버리지 기준으로 적지 않는다.
- 바 상세 인증 정책 검증은 제품 정책 기준으로 필요 테스트에 포함한다.
