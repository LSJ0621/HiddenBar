# E2E 테스트 인프라 설정

## 백엔드 E2E 인프라

### 프레임워크

- **테스트 러너**: Jest
- **HTTP 클라이언트**: supertest
- **데이터베이스**: PostgreSQL (`hiddenbar_test`)

### 헬퍼 함수 (`backend/test/e2e-test-helper.ts`)

| 헬퍼 | 설명 |
|------|------|
| `createTestApp()` | NestJS 테스트 앱 생성. DATA_SOURCE를 testDataSource로 오버라이드. `cookieParser` 미들웨어 등록. 글로벌 prefix `/api/v1`, ValidationPipe(strict), AllExceptionsFilter 적용 |
| `extractAccessToken(res)` | `set-cookie` 헤더에서 `accessToken` 값을 파싱하여 반환. 추출된 토큰은 `.set('Cookie', \`accessToken=${token}\`)` 형태로 후속 요청에 전달된다 (쿠키 기반 인증) |
| `extractRefreshToken(res)` | `set-cookie` 헤더에서 `refreshToken` 값을 파싱하여 반환 |
| `generateTestVerificationToken(email, app)` | JwtService로 테스트용 `verificationToken` 생성 (purpose: SIGNUP, 유효기간 10분). `signupUser()` 내부에서 호출 |
| `signupUser(app, {email, password, name})` | `generateTestVerificationToken()`으로 verificationToken을 생성하여 POST `/api/v1/auth/signup` → 201. `set-cookie`에서 토큰 추출 후 `{accessToken, refreshToken, user}` 반환 |
| `loginUser(app, {email, password})` | POST `/api/v1/auth/login` → 200. `set-cookie`에서 토큰 추출 후 `{accessToken, refreshToken, user}` 반환 |
| `createAdminUser(app, {email, password, name})` | 회원가입 후 DB에서 직접 role → ADMIN 변경, 재로그인하여 ADMIN JWT 반환 |
| `createBar(app, token, dto)` | POST `/api/v1/bars` → 201. 바 생성 후 bar 객체 반환 |
| `createApprovedBar(app, token, adminToken, dto)` | `createBar()` + PATCH `/api/v1/admin/bars/:id/approve` 관리자 승인. `status: 'APPROVED'` 바 반환 |
| `uploadPhoto(app, token, barId, filePath)` | POST `/api/v1/bars/:id/photos` multipart 업로드. supertest `.attach('files', filePath)` 활용 → 201 |
| `addBookmark(app, token, barId)` | PUT `/api/v1/bars/:id/bookmark` → 200. 북마크 추가 |
| `removeBookmark(app, token, barId)` | DELETE `/api/v1/bars/:id/bookmark` → 200. 북마크 제거 |
| `createTestAppWithGoogleMock()` | `GoogleOAuthClient`를 mock으로 오버라이드한 테스트 앱 생성. `code === 'valid-code'` → mock 프로필 반환, 그 외 → 에러 throw |

### 데이터베이스 관리

- **초기화**: `initTestDb()` — 테스트 DB 연결 및 스키마 동기화
- **정리**: `truncateAllTables()` — 모든 테이블 TRUNCATE CASCADE (각 테스트 스위트 전후)
- **격리**: 각 describe 블록에서 `beforeAll`/`afterAll`로 DB 상태 관리

### 테스트 상수 (`backend/test/test-constants.ts`)

표준 테스트 데이터를 상수로 관리한다. E2E 테스트 파일에서 직접 데이터를 정의하는 대신 이 파일의 상수를 임포트하여 사용한다.

| 상수 | 설명 |
|------|------|
| `TEST_USER_1` | `{email: 'user1@test.com', password: '<test-password>', name: '테스트유저1'}` |
| `TEST_USER_2` | `{email: 'user2@test.com', password: '<test-password>', name: '테스트유저2'}` |
| `TEST_ADMIN` | `{email: 'admin@test.com', password: '<test-password>', name: '관리자'}` |
| `TEST_BAR_DTO` | 현재 정책 기준 표준 바 DTO 템플릿. `name`, `description`, `address`, `city`, `country`, `latitude`, `longitude`를 사용한다. |

### 테스트 픽스처 파일 (`backend/test/fixtures/`)

| 파일 | 용도 |
|------|------|
| `test-image.jpg` | 유효한 JPEG 이미지 — 파일 업로드 성공 케이스 |
| `test-file.txt` | 무효 파일 — 이미지 검증 실패(400) 케이스 |

### Google OAuth 모킹 전략

- `GoogleOAuthClient` 프로바이더를 테스트 모듈에서 오버라이드
- Mock 구현: `code === 'valid-code'` → mock accessToken + 프로필(`{id, email, name, picture}`) 반환, 그 외 → 에러 throw
- 별도 `createTestAppWithGoogleMock()` 헬퍼로 분리 구현 완료

### Google Maps API 모킹 전략

외부 API(Google Routes API v2, Google Places API) 의존 엔드포인트는 프로바이더 오버라이드로 모킹한다. OAuth 모킹과 동일한 패턴이다.

**모킹 대상:**

| 프로바이더 | 실제 역할 | mock 방식 |
|-----------|----------|----------|
| `MapsService` | Google Routes API v2 호출 (`HttpService.post()` 직접 사용) | `MapsService` 자체를 오버라이드 |
| `GooglePlacesClient` | Google Places Autocomplete/Details API 호출 | `GooglePlacesClient`를 오버라이드 (DI 주입) |

**헬퍼: `createTestAppWithMapsMock()`** (세션 C에서 구현 예정)

- `MapsService.getDirections()` mock: 입력 파라미터에 따라 고정 응답/에러 반환
- `GooglePlacesClient.autocomplete()` mock: 쿼리에 따라 mock suggestions 또는 빈 배열 반환
- `GooglePlacesClient.getDetails()` mock: 고정 장소 상세 반환
- `GooglePlacesClient.createSessionToken()` mock: 고정 토큰 반환
- `UserThrottlerGuard`는 오버라이드하지 않음 — 속도 제한 테스트가 정상 동작해야 함

**에러 시뮬레이션:**
- `mockRejectedValueOnce(new NotFoundException(...))` — 경로 없음
- `mockRejectedValueOnce(new BadGatewayException(...))` — Google API 장애
- `mockRejectedValueOnce(new ServiceUnavailableException(...))` — API quota 초과

**주의:** `GET /api/v1/bars/nearby`는 DB 쿼리 기반이므로 Maps mock이 필요 없다. 실제 APPROVED 바를 시딩하여 테스트한다.

### 파일 업로드 테스트

- supertest `.attach('files', filePath)` 활용
- 테스트용 이미지 파일: `backend/test/fixtures/test-image.jpg` (유효), `test-file.txt` (무효)
- multipart/form-data Content-Type 자동 설정

---

## 프론트엔드 E2E 인프라 (Playwright)

### 설치 및 설정

- **패키지**: `@playwright/test` (devDependency)
- **설정 파일**: `frontend/playwright.config.ts`
- **테스트 디렉토리**: `frontend/e2e/`
- **브라우저**: Chromium (기본), Firefox/WebKit (선택적 CI 매트릭스)

### Playwright 설정 (`playwright.config.ts`)

```
- testDir: './e2e'
- baseURL: 'http://localhost:3000'
- fullyParallel: true
- retries: CI 환경 2회, 로컬 0회
- reporter: 'html'
- projects:
  - setup: auth.setup.ts (인증 상태 사전 준비)
  - chromium: Desktop Chrome (setup 의존)
- webServer:
  - backend: command 'cd ../backend && pnpm start', port 4000
  - frontend: command 'pnpm dev', port 3000
  - reuseExistingServer: !CI (로컬에서는 기존 서버 재사용)
- use:
  - trace: 'on-first-retry'
  - screenshot: 'only-on-failure'
```

### 인증 픽스처 (storageState 기반)

> 제품/API 계약은 쿠키 기반 인증이다. Playwright의 `request.storageState()`는 API 응답의 `set-cookie`를 자동으로 쿠키로 저장하므로, 현재 테스트 코드는 쿠키 기반 인증 계약과 일치한다.

**글로벌 setup (`frontend/e2e/fixtures/auth.setup.ts`)**

- `authenticate as user` — 사전 생성된 계정(`user1@test.com`)으로 POST `/api/v1/auth/login` 후 `request.storageState({ path: 'e2e/.auth/user.json' })`으로 쿠키 기반 storageState 저장
- `authenticate as admin` — 환경변수(`ADMIN_EMAIL`, `ADMIN_PASSWORD`)에서 관리자 크레덴셜을 읽어 POST `/api/v1/auth/login` 후 `request.storageState({ path: 'e2e/.auth/admin.json' })`으로 쿠키 기반 storageState 저장
- 계정은 백엔드 init 서비스(AdminInitService, SeedInitService)가 서버 시작 시 생성한다
- storageState 형식: `request.storageState()`가 생성하는 JSON으로, 로그인 응답의 `set-cookie` 헤더에서 받은 쿠키(`accessToken`, `refreshToken`)를 포함한다

**픽스처 (`frontend/e2e/fixtures/test-fixtures.ts`)**

| 픽스처 | 설명 |
|--------|------|
| `unauthenticated` | 빈 storageState (`{cookies: [], origins: []}`) |
| `authenticatedUser` | `e2e/.auth/user.json` storageState 적용 (일반 유저) |
| `authenticatedAdmin` | `e2e/.auth/admin.json` storageState 적용 (관리자) |

- 테스트에서 픽스처를 `import`하여 `test` 대신 픽스처 함수를 사용

### Smoke Test (`frontend/e2e/example.spec.ts`)

| 테스트 | 설명 |
|--------|------|
| `홈페이지에 접근할 수 있다` | `GET /` → URL `/` 확인 (비인증 접근 가능 smoke test) |

### 로케이터 전략

- **기본**: `page.getByTestId('xxx')` — `data-testid` 속성 기반
- **폼 요소**: `page.getByLabel('xxx')` 보조 사용
- **텍스트 확인**: `page.getByText('xxx')`, `expect(locator).toHaveText('xxx')`
- **네비게이션**: `page.waitForURL('xxx')`, `expect(page).toHaveURL('xxx')`

---

## 공통 테스트 데이터

> 백엔드 E2E: `backend/test/test-constants.ts`의 상수를 임포트하여 사용한다.
> 프론트엔드 E2E: `frontend/e2e/fixtures/auth.setup.ts`에 동일한 값을 인라인으로 정의한다.

### 표준 테스트 유저

| 역할 | 이메일 | 비밀번호 | 이름 |
|------|--------|---------|------|
| 일반 유저 1 | `user1@test.com` | `<test-password>` | `테스트유저1` |
| 일반 유저 2 | `user2@test.com` | `<test-password>` | `테스트유저2` |
| 관리자 | `admin@test.com` | `<test-password>` | `관리자` |

### 표준 바 DTO 템플릿

```
{
  name: '테스트 바',
  description: '테스트용 바입니다',
  address: '서울시 강남구 테헤란로 123',
  city: 'Seoul',
  country: 'South Korea',
  latitude: 37.5065,
  longitude: 127.0536
}
```

> `category`는 제거된 레거시 개념이다. 테스트 상수(`test-constants.ts`)에서도 제거 완료되었다 (2026-03-23).

### Enum 값 상수

| Enum | 값 |
|------|----|
| DayOfWeek | `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN` |
| BarStatus | `PENDING`, `APPROVED`, `REJECTED` |
| UserRole | `USER`, `ADMIN` |
| AdminActionType | `BAR_APPROVED`, `BAR_REJECTED`, `BAR_DELETED`, `USER_SUSPENDED`, `USER_ACTIVATED`, `USER_ROLE_CHANGED` |
| TravelMode | `WALKING`, `TRANSIT`, `DRIVING` |

> `Category` enum은 현재 SoT 기준에서 제거되었다.
