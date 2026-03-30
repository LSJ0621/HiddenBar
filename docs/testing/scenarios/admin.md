# 관리자 기능 E2E 시나리오

## 백엔드 API E2E

### 대시보드 (`GET /api/v1/admin/dashboard`)


| #   | 시나리오       | 기대 결과                                                                                  | 기존 커버 |
| --- | ---------- | -------------------------------------------------------------------------------------- | ----- |
| 1   | 관리자 통계 조회  | 200 + totalBars, pendingBars, reportedReviews, totalUsers, totalBookmarks 등 (kpiCards) | ✅     |
| ~~2~~   | ~~국가별 통계 포함~~  | ~~barsByCountry 배열~~ (서비스 미구현 — 삭제)                                                    | —     |
| 3   | 비관리자 → 403 | 403 Forbidden                                                                          | ✅     |
| 4   | 미인증 → 401  | 401 Unauthorized                                                                       | ✅     |


### 바 목록 (`GET /api/v1/admin/bars`)


| #   | 시나리오                          | 기대 결과                | 기존 커버 |
| --- | ----------------------------- | -------------------- | ----- |
| 1   | 전체 바 목록 조회                    | 200 + items[] + meta | ✅     |
| 2   | 상태 필터: `?status=PENDING`      | PENDING 바만 반환        | ✅     |
| 3   | 상태 필터: `?status=APPROVED`     | APPROVED 바만 반환       | ✅     |
| 4   | 상태 필터: `?status=REJECTED`     | REJECTED 바만 반환       | ✅     |
| 5   | 이름 검색: `?q=test`              | 이름/주소에 "test" 포함된 바  | ✅     |
| 6   | 국가 필터: `?country=South Korea` | 해당 국가 바만 반환          | ✅     |
| 7   | 정렬: `?sortBy=newest`          | createdAt DESC       | ✅     |
| 8   | 정렬: `?sortBy=oldest`          | createdAt ASC        | ✅     |
| 9   | 정렬: `?sortBy=name`            | name ASC             | ✅     |
| 10  | 페이지네이션: `?page=1&limit=10`    | 올바른 meta             | ✅     |


### 바 상세 (`GET /api/v1/admin/bars/:id`)


| #   | 시나리오               | 기대 결과                         | 기존 커버 |
| --- | ------------------ | ----------------------------- | ----- |
| 1   | 바 상세 + 관리자 액션 히스토리 | 200 + bar 정보 + adminActions[] | ✅     |
| 2   | 존재하지 않는 바 ID       | 404 Not Found                 | ✅     |


### 바 승인 (`PATCH /api/v1/admin/bars/:id/approve`)


| #   | 시나리오           | 기대 결과                             | 기존 커버 |
| --- | -------------- | --------------------------------- | ----- |
| 1   | PENDING 바 승인   | 200 + status: APPROVED + 감사 로그 생성 | ✅     |
| 2   | 이미 승인된 바 승인 시도 | 409 Conflict                      | ✅     |
| 3   | REJECTED 바 승인  | 409 Conflict (PENDING만 승인 가능)     | ✅     |
| 4   | 존재하지 않는 바      | 404 Not Found                     | ✅     |


### 바 거절 (`PATCH /api/v1/admin/bars/:id/reject`)


| #   | 시나리오                         | 기대 결과                          | 기존 커버 |
| --- | ---------------------------- | ------------------------------ | ----- |
| 1   | PENDING 바 거절 (사유 포함, 10자 이상) | 200 + status: REJECTED + 감사 로그 | ✅     |
| 2   | 사유 10자 미만                    | 400 Bad Request                | ✅     |
| 3   | 사유 미포함                       | 400 Bad Request                | ✅     |
| 4   | 이미 거절된 바                     | 409 Conflict                   | ✅     |
| 5   | 존재하지 않는 바                    | 404 Not Found                  | ✅     |


### 바 삭제 (`DELETE /api/v1/admin/bars/:id`)


| #   | 시나리오       | 기대 결과                               | 기존 커버 |
| --- | ---------- | ----------------------------------- | ----- |
| 1   | 관리자 소프트 삭제 | 204 No Content + 감사 로그(BAR_DELETED) | ✅     |
| 2   | 존재하지 않는 바  | 404 Not Found                       | ✅     |
| 3   | 이미 삭제된 바   | 409 Conflict (ConflictException)    | ✅     |


### 유저 목록 (`GET /api/v1/admin/users`)


| #   | 시나리오                        | 기대 결과                | 기존 커버 |
| --- | --------------------------- | -------------------- | ----- |
| 1   | 전체 유저 목록                    | 200 + items[] + meta | ✅     |
| 2   | 이메일/이름 검색: `?q=test`        | 매칭 유저 반환             | ✅     |
| 3   | 역할 필터: `?role=ADMIN`        | ADMIN 유저만 반환         | ✅     |
| 4   | 활성 상태 필터: `?isActive=true`  | 활성 유저만 반환            | ✅     |
| 5   | 활성 상태 필터: `?isActive=false` | 정지 유저만 반환            | ✅     |
| 6   | 페이지네이션: `?page=1&limit=10`  | 올바른 meta             | ✅     |


### 유저 상세 (`GET /api/v1/admin/users/:id`)


| #   | 시나리오                    | 기대 결과                                   | 기존 커버 |
| --- | ----------------------- | --------------------------------------- | ----- |
| 1   | 유저 정보 + 소유 바 수 + 관리자 액션 | 200 + user + barCount + recentActions[] | ✅     |
| 2   | 존재하지 않는 유저 ID           | 404 Not Found                           | ✅     |


### 유저 정지 (`PATCH /api/v1/admin/users/:id/suspend`)


| #   | 시나리오              | 기대 결과                                               | 기존 커버 |
| --- | ----------------- | --------------------------------------------------- | ----- |
| 1   | 활성 유저 정지 (사유 포함)  | 200 + isActive: false + 감사 로그 + refresh token 전체 삭제 | ✅     |
| 2   | 정지 후 해당 유저 로그인 시도 | 403 Forbidden                                       | ✅     |
| 3   | 자기 자신 정지 시도       | 403 Forbidden                                       | ✅     |
| 4   | 이미 정지된 유저 정지 시도   | 409 Conflict                                        | ✅     |
| 5   | 존재하지 않는 유저        | 404 Not Found                                       | ✅     |


### 유저 활성화 (`PATCH /api/v1/admin/users/:id/activate`)


| #   | 시나리오             | 기대 결과                        | 기존 커버 |
| --- | ---------------- | ---------------------------- | ----- |
| 1   | 정지된 유저 활성화       | 200 + isActive: true + 감사 로그 | ✅     |
| 2   | 활성화 후 해당 유저 로그인  | 200 (로그인 성공)                 | ✅     |
| 3   | 이미 활성인 유저 활성화 시도 | 409 Conflict                 | ✅     |
| 4   | 존재하지 않는 유저       | 404 Not Found                | ✅     |


### 역할 변경 (`PATCH /api/v1/admin/users/:id/role`)


| #   | 시나리오         | 기대 결과                     | 기존 커버 |
| --- | ------------ | ------------------------- | ----- |
| 1   | USER → ADMIN | 200 + role: ADMIN + 감사 로그 | ✅     |
| 2   | ADMIN → USER | 200 + role: USER + 감사 로그  | ✅     |
| 3   | 자기 자신 역할 변경  | 403 Forbidden             | ✅     |
| 4   | 동일 역할로 변경    | 409 Conflict              | ✅     |
| 5   | 유효하지 않은 역할 값 | 400 Bad Request           | ✅     |
| 6   | 존재하지 않는 유저   | 404 Not Found             | ✅     |


### 감사 로그 (`GET /api/v1/admin/actions`)


| #   | 시나리오                                 | 기대 결과                                                         | 기존 커버  |
| --- | ------------------------------------ | ------------------------------------------------------------- | ------ |
| 1   | 전체 감사 로그 조회                          | 200 + items[]{actionType, targetId, reason, admin, createdAt} | ✅ (부분) |
| 2   | 액션 타입 필터: `?actionType=BAR_APPROVED` | 해당 타입만 반환                                                     | ✅      |
| 3   | 관리자 ID 필터: `?adminId={id}`           | 해당 관리자 액션만 반환                                                 | ✅      |
| 4   | 페이지네이션                               | 올바른 meta                                                      | ✅      |
| 5   | 정렬: createdAt DESC (기본)              | 최신 액션 우선                                                      | ✅      |


### 권한 검증


| #   | 시나리오                                | 기대 결과            | 기존 커버 |
| --- | ----------------------------------- | ---------------- | ----- |
| 1   | 비관리자: GET /admin/dashboard          | 403 Forbidden    | ✅     |
| 2   | 비관리자: GET /admin/bars               | 403 Forbidden    | ✅     |
| 3   | 비관리자: GET /admin/users              | 403 Forbidden    | ✅     |
| 4   | 비관리자: PATCH /admin/bars/:id/approve | 403 Forbidden    | ✅     |
| 5   | 미인증: 모든 admin 엔드포인트                 | 401 Unauthorized | ✅     |


### 신고 목록 (`GET /api/v1/admin/review-reports`)


| #   | 시나리오                         | 기대 결과                         | 기존 커버 |
| --- | ---------------------------- | ----------------------------- | ----- |
| 1   | 관리자 인증으로 신고 목록 조회            | 200 + items[] + meta (페이지네이션) | ✅     |
| 2   | status 필터: `?status=PENDING` | PENDING 신고만 반환                | ✅     |
| 3   | 미인증 요청                       | 401 Unauthorized              | ✅     |
| 4   | 비관리자(USER 역할) 요청             | 403 Forbidden                 | ✅     |


### 신고 상세 (`GET /api/v1/admin/review-reports/:id`)


| #   | 시나리오             | 기대 결과                     | 기존 커버 |
| --- | ---------------- | ------------------------- | ----- |
| 1   | 유효한 ID로 신고 상세 조회 | 200 + 리뷰 본문·작성자·신고자 정보 포함 | ✅     |
| 2   | 존재하지 않는 ID       | 404 Not Found             | ✅     |


### 신고 처리 (`PATCH /api/v1/admin/review-reports/:id/resolve`)


| #   | 시나리오                                                             | 기대 결과                       | 기존 커버 |
| --- | ---------------------------------------------------------------- | --------------------------- | ----- |
| 1   | RESTORE 액션 — PENDING report를 RESOLVED로 일괄 처리하고 리뷰를 PUBLISHED로 복구 | 200 + resolution 포함 결과      | ✅     |
| 2   | HIDE 액션 — 리뷰를 HIDDEN으로 처리                                        | 200                         | ✅     |
| 3   | DELETE 액션 — 리뷰를 soft-delete                                      | 200                         | ✅     |
| 4   | 이미 RESOLVED 상태인 report 처리 시도                                     | 409 Conflict                | ✅     |
| 5   | 존재하지 않는 report ID                                                | 404 Not Found               | ✅     |
| 6   | 유효하지 않은 action 값                                                 | 400 Bad Request (DTO 검증)    | ✅     |
| 7   | 리뷰가 이미 목표 상태인 경우 moderation skip, report만 RESOLVED               | 200                         | ✅     |
| 8   | 리뷰가 이미 soft-delete 상태인 경우 skip                                   | 200                         | ✅     |
| 9   | 처리 완료 후 processedByAdminId·processedAt·resolutionNote 저장         | manager.update 호출에 해당 필드 포함 | ✅     |


### 신고 접수 (`POST /api/v1/reviews/:reviewId/report`) — 서비스 단위


| #   | 시나리오                                                             | 기대 결과                            | 기존 커버 |
| --- | ---------------------------------------------------------------- | -------------------------------- | ----- |
| 1   | PUBLISHED 리뷰 신고 → report 생성 + 리뷰 REPORTED 전환 + decrementStats 호출 | 정상 처리                            | ✅     |
| 2   | 이미 REPORTED 리뷰에 신고 → report만 생성, 상태·집계 변경 없음                     | 정상 처리                            | ✅     |
| 3   | 본인 리뷰 신고                                                         | 403 ForbiddenException           | ✅     |
| 4   | 동일 사용자 중복 신고 (DB unique 위반)                                      | 409 ConflictException            | ✅     |
| 5   | 존재하지 않는 리뷰 신고                                                    | 404 NotFoundException            | ✅     |
| 6   | HIDDEN 리뷰 신고                                                     | 404 NotFoundException (존재 노출 방지) | ✅     |
| 7   | soft-deleted 리뷰 신고                                               | 404 NotFoundException            | ✅     |
| 8   | detail이 공백만 있는 경우 null 정규화                                       | manager.create 호출 시 detail: null | ✅     |
| 9   | detail이 없는 경우 null 저장                                            | manager.create 호출 시 detail: null | ✅     |
| 10  | 사진 있는 PUBLISHED 리뷰 신고 → hasPhoto=true로 decrementStats 호출         | 정상 처리                            | ✅     |
| 11  | 리뷰 조회 시 pessimistic_write lock 사용                                | manager.findOne lock 옵션 포함       | ✅     |


---

## 프론트엔드 브라우저 E2E

### 대시보드 (`/admin`)


| #   | 시나리오  | 검증 항목                                                                                                                                                    |
| --- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 사이드바  | `admin-sidebar` 노출. 네비게이션 항목: Dashboard, Bar Management, User Management, Review Reports, Activity Log                                                   |
| 2   | 통계 카드 | `dashboard-stat-totalBars`, `dashboard-stat-pendingBars`, `dashboard-stat-reportedReviews`, `dashboard-stat-totalUsers`, `dashboard-stat-totalBookmarks` |
| 3   | 차트    | BarRegistrationTrendChart (등록 추이), BarStatusDonutChart (상태 분포), UserSignupTrendChart (가입 추이), TopBookmarkedBarsChart (인기 바)                              |


### 바 관리 (`/admin/bars`)


| #   | 시나리오    | 검증 항목                                           |
| --- | ------- | ----------------------------------------------- |
| 1   | 테이블 렌더링 | 바 목록 테이블 + 행 표시 (관리자 바 목록에는 전용 data-testid 미부여) |
| 2   | 상태 탭 필터 | 상태 탭 (ALL/PENDING/APPROVED/REJECTED) 클릭 → 필터링   |
| 3   | 검색      | 검색 입력 필드 → 결과 업데이트                              |
| 4   | 페이지네이션  | 페이지 전환 → 새 행 표시                                 |
| 5   | 행 클릭    | `/admin/bars/[id]`로 이동                          |


### 바 상세 리뷰 (`/admin/bars/[id]`)


| #   | 시나리오     | 검증 항목                                                     |
| --- | -------- | --------------------------------------------------------- |
| 1   | 정보 표시    | 바 이름, 소유자, 주소, 사진, 메뉴, 영업시간                               |
| 2   | 액션 히스토리  | 이전 승인/거절/삭제 이력 표시                                         |
| 3   | 승인       | 승인 버튼 → 확인 다이얼로그 → 상태 APPROVED + 토스트 (전용 data-testid 미부여) |
| 4   | 거절       | 거절 버튼 → 사유 입력 (10자 이상) → 제출 → 상태 REJECTED                 |
| 5   | 거절 사유 부족 | 10자 미만 → 인라인 에러                                           |
| 6   | 삭제       | 삭제 버튼 → 확인 다이얼로그 → 목록으로 이동                                |


### 유저 관리 (`/admin/users`)


| #   | 시나리오     | 검증 항목                                 |
| --- | -------- | ------------------------------------- |
| 1   | 테이블 렌더링  | 유저 목록 테이블 + 행 표시 (전용 data-testid 미부여) |
| 2   | 검색       | 이메일/이름 검색 입력 필드 → 결과 업데이트             |
| 3   | 역할 필터    | 역할 드롭다운 → 필터링                         |
| 4   | 활성 상태 필터 | 활성/정지 필터 → 필터링                        |
| 5   | 페이지네이션   | 페이지 전환                                |
| 6   | 행 클릭     | `/admin/users/[id]`로 이동               |


### 유저 상세 (`/admin/users/[id]`)


| #   | 시나리오     | 검증 항목                                                     |
| --- | -------- | --------------------------------------------------------- |
| 1   | 정보 표시    | 이메일, 이름, 역할, 활성 상태, 소유 바, 관리자 액션 히스토리                     |
| 2   | 유저 정지    | 정지 버튼 → 사유 입력 (10자 이상) → 제출 → 비활성 표시 (전용 data-testid 미부여) |
| 3   | 유저 활성화   | 활성화 버튼 → 활성 표시                                            |
| 4   | 역할 변경    | 역할 변경 버튼 → 다이얼로그 → ADMIN 선택 → 확인 → 역할 업데이트                |
| 5   | 자기 자신 액션 | 정지/역할 변경 버튼 disabled 또는 403 토스트                           |


### 감사 로그 (`/admin/actions`)


| #   | 시나리오     | 검증 항목                                                       |
| --- | -------- | ----------------------------------------------------------- |
| 1   | 테이블 렌더링  | 감사 로그 테이블 + 행 (액션 타입, 대상, 사유, 관리자, 시간) (전용 data-testid 미부여) |
| 2   | 액션 타입 필터 | 액션 타입 드롭다운 → 필터링                                            |
| 3   | 페이지네이션   | 페이지 전환                                                      |


### 리뷰 신고 관리 (`/admin/review-reports`)


| #   | 시나리오   | 검증 항목                                           |
| --- | ------ | ----------------------------------------------- |
| 1   | 목록 렌더링 | 신고 목록 테이블 표시 (ID, 사유, 신고자, 리뷰 상태, 신고 상태, 날짜 컬럼) |
| 2   | 상태 필터  | All / Pending / Resolved 탭 전환 → 필터링             |
| 3   | 행 클릭   | `/admin/review-reports/[id]`로 이동                |
| 4   | 페이지네이션 | 다수 신고 시 페이지 전환                                  |


### 리뷰 신고 상세 (`/admin/review-reports/[id]`)


| #   | 시나리오                | 검증 항목                                                       |
| --- | ------------------- | ----------------------------------------------------------- |
| 1   | 신고 정보               | Report Info 카드: 사유, 상세, 신고자, 접수일 표시                         |
| 2   | 리뷰 정보               | Review Info 카드: 리뷰 내용, 평점, 작성자, 리뷰 상태, 방문일 표시               |
| 3   | PENDING → Resolve 폼 | Action 드롭다운 (RESTORED/HIDDEN/DELETED) + Note 입력 + Submit 버튼 |
| 4   | 처리 성공               | Submit → `/admin/review-reports` 목록으로 이동                    |
| 5   | RESOLVED → 결과 표시    | Resolution 카드: Action, Note, Processed 날짜 표시                |
| 6   | 뒤로가기                | 뒤로 버튼 → `/admin/review-reports` 이동                          |


### 권한 보호


| #   | 시나리오    | 검증 항목                       |
| --- | ------- | --------------------------- |
| 1   | 비관리자 접근 | `/admin` → `/` 리다이렉트 또는 403 |
| 2   | 미인증 접근  | `/admin` → `/login` 리다이렉트   |


