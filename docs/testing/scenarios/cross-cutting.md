# 횡단 관심사 E2E 시나리오

## 백엔드

### 글로벌 ValidationPipe

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 알 수 없는 필드 포함 요청 (forbidNonWhitelisted) | 400 Bad Request + "property X should not exist" |
| 2 | 빈 body 전송 (필수 필드 있는 엔드포인트) | 400 Bad Request + 필드별 에러 메시지 |
| 3 | 잘못된 타입 (숫자 필드에 문자열) | 400 Bad Request |

### 글로벌 ExceptionFilter

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 400 에러 응답 형식 | `{ statusCode: 400, message: [...], error: 'Bad Request' }` |
| 2 | 401 에러 응답 형식 | `{ statusCode: 401, message: '...', error: 'Unauthorized' }` |
| 3 | 403 에러 응답 형식 | `{ statusCode: 403, message: '...', error: 'Forbidden' }` |
| 4 | 404 에러 응답 형식 | `{ statusCode: 404, message: '...', error: 'Not Found' }` |
| 5 | 409 에러 응답 형식 | `{ statusCode: 409, message: '...', error: 'Conflict' }` |

### JWT 인증

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 만료된 access token으로 보호 엔드포인트 접근 | 401 Unauthorized |
| 2 | 변조된(payload 수정) JWT | 401 Unauthorized |
| 3 | 잘못된 서명의 JWT | 401 Unauthorized |
| 4 | accessToken 쿠키 누락 | 401 Unauthorized |
| 5 | accessToken 쿠키에 유효하지 않은 값 | 401 Unauthorized |

### 소프트 삭제 캐스케이드

| # | 시나리오 | 기대 결과 | 기존 커버 |
|---|---------|----------|----------|
| 1 | 바 삭제 시 photos 소프트 삭제 | photos.deletedAt IS NOT NULL | ✅ |
| 2 | 바 삭제 시 menu_items 소프트 삭제 | menu_items.deletedAt IS NOT NULL | ✅ |
| 3 | 바 삭제 시 operating_hours 소프트 삭제 | operating_hours.deletedAt IS NOT NULL | ✅ |
| 4 | 바 삭제 시 bookmarks 소프트 삭제 | bookmarks.deletedAt IS NOT NULL | ✅ |
| 5 | 바 삭제 시 admin_actions 유지 | admin_actions 삭제 안 됨 | ✅ |
| 6 | 소프트 삭제된 바 API 조회 | 404 Not Found | ✅ |
| 7 | withDeleted 쿼리로 DB 직접 조회 | deletedAt IS NOT NULL 레코드 존재 | ✅ |

### 속도 제한

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | maps/directions 엔드포인트 한도 초과 (10/분) | 429 Too Many Requests | ✅ |
| 2 | maps/address/search 엔드포인트 한도 초과 (10/분) | 429 Too Many Requests | ✅ |
| 3 | bars/nearby 엔드포인트 한도 초과 (10/분) | 429 Too Many Requests | ✅ |

---

## 프론트엔드

### 토큰 자동 갱신

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | Access token 만료 → silent refresh | API 요청 실패 → 자동 갱신 → 원래 요청 재시도 → 성공 |
| 2 | 동시 요청 중 갱신 | 여러 요청이 동시 401 → 한 번만 refresh → 모든 요청 재시도 |
| 3 | Refresh token도 만료 | 갱신 실패 → `isLoggedIn` 쿠키 삭제 (clearIsLoggedIn) → `/login` 리다이렉트 |

### 404 페이지

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | 존재하지 않는 경로 | not-found 페이지 렌더링 |
| 2 | 홈 링크 | "홈으로" 링크 → `/` 이동 |

### 에러 바운더리

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | 메인 섹션 렌더링 에러 | 에러 UI + 재시도 버튼 표시. E2E: `test.fixme()` — TanStack Query가 API 에러를 catch하여 Next.js error boundary 미트리거. 단위 테스트(`error.test.tsx`)에서 커버. |
| 2 | 재시도 | 재시도 버튼 클릭 → 컴포넌트 재렌더링. E2E: 위 #1과 동일 사유로 `test.fixme()` 처리. 단위 테스트에서 커버. |

### 로딩 상태

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | 페이지 전환 → 콘텐츠 로드 | 스켈레톤 표시 후 실제 콘텐츠로 전환. E2E: #1과 #2를 단일 테스트로 통합 (`should show loading state and replace with content`). 스켈레톤 명시적 검증은 생략, 콘텐츠 최종 로드만 확인. |
| ~~2~~ | ~~데이터 로드 완료~~ | ~~위 #1에 통합~~ |

### 반응형 레이아웃

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | 모바일 (375px) — 홈 | 레이아웃 깨짐 없이 렌더링 |
| 2 | 모바일 (375px) — 검색 | 필터 패널 접힘/펼침 |
| 3 | 모바일 (375px) — 바 상세 | 단일 컬럼 레이아웃 |
| 4 | 모바일 (375px) — 관리자 | 사이드바 햄버거 메뉴 |
| 5 | 데스크톱 (1280px) — 홈 | 검색 진입 CTA와 주요 랜딩 콘텐츠가 안정적으로 렌더링 |
| 6 | 데스크톱 (1280px) — 검색 | 사이드 필터 + 결과 리스트 |
| 7 | 데스크톱 (1280px) — 관리자 | 사이드바 항상 노출 |

### 미들웨어 라우트 보호

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| 1 | 미인증 → 보호 경로 (`/search`, `/bars/[id]`, `/bars/[id]/edit`, `/bookmarks`, `/profile`, `/profile/edit`, `/my-bars`, `/bars/new`, `/directions`) | `/login` 리다이렉트 |
| 2 | 비관리자 → `/admin/*` | 미들웨어: 인증 여부만 확인 (accessToken 쿠키). 역할 검증은 클라이언트 `AdminSidebar`에서 수행 → 비관리자 시 `/`로 리다이렉트 + 토스트 |
| 3 | 인증 유저 → `/login`, `/signup` | `/` 리다이렉트 |
