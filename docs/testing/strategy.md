# Hidden Bar 테스트 전략

> 관련 문서: [문서 안내](../README.md), [테스트 인프라](./infrastructure.md), [시나리오](./scenarios/), [커버리지 매트릭스](./coverage-matrix.md)
> 이 문서는 테스트 구조의 정본이다.
> 아래 내용은 "현재 존재하는 테스트"와 "작성 예정 테스트"를 구분해서 읽어야 한다.

> 작성일: 2026-03-04
> 프로젝트: Hidden Bar (NestJS + Next.js)

---

## 1. 테스트 전략 개요

### 1.1 테스트 레벨

| 레벨 | 도구 | 대상 | 목적 |
|------|------|------|------|
| **Unit Test** | Jest + mocking | Service 클래스 | 비즈니스 로직의 정확성 검증. 외부 의존성(DB, 외부 API)은 mock 처리 |
| **Integration Test** | Jest + supertest | Controller 엔드포인트 | HTTP 요청/응답 흐름, DTO 유효성 검증, Guard 동작 검증 |
| **Backend E2E** | Jest + supertest + 테스트 DB | 핵심 사용자 시나리오 | 실제 DB를 사용한 전체 플로우 검증 (회원가입 -> 로그인 -> 가게 등록 -> 검색 등) |
| **Frontend E2E** | Playwright | 브라우저 사용자 시나리오 | 실제 브라우저에서 UI 인터랙션, 페이지 네비게이션, 인증 상태 관리 검증 |

### 1.2 테스트 원칙

- **AAA 패턴**: Arrange(준비) -> Act(실행) -> Assert(검증) 구조 사용
- **테스트 격리**: 각 테스트는 독립적으로 실행 가능해야 함
- **Mock 전략**: Service 단위 테스트에서는 TypeORM Repository, 외부 API 클라이언트를 mock 처리
- **테스트 커버리지 목표**:
  - 개별 파일 단위: 서비스 로직 90% 이상, 컨트롤러 80% 이상
  - 프로젝트 전체 하한선 (Jest `coverageThreshold`로 강제): Statements 85%, Branches 75%, Functions 80%, Lines 85%
  - `coveragePathIgnorePatterns` 제외 대상: migrations, seeds, common/init, main.ts, data-source.ts, *.module.ts, *.entity.ts, external/mocks/
  - 제외 사유: DI 설정(module), 스키마 정의(entity — lifecycle hook은 E2E에서 커버), 인프라 코드(migrations, seeds, init), 테스트 헬퍼(mocks)

### 1.3 테스트 파일 네이밍

- 백엔드 단위/통합 테스트 파일은 `*.spec.ts`, 프론트엔드 컴포넌트 테스트 파일은 `*.test.tsx` 확장자를 사용하며, 소스 파일과 동일한 디렉토리에 위치시킨다 (co-location).
- 백엔드 E2E 테스트 파일은 `*.e2e-spec.ts` 확장자를 사용하며, `backend/test/` 디렉토리에 위치시킨다.
- 프론트엔드 E2E 테스트 파일은 `*.spec.ts` 확장자를 사용하며, `frontend/e2e/` 디렉토리에 위치시킨다.

---

## 2. 테스트 파일 위치 규칙

```
backend/src/
├── app.controller.spec.ts               # AppController 단위 테스트
├── auth/
│   ├── auth.service.ts
│   ├── auth.service.spec.ts               # AuthService 단위 테스트
│   ├── auth-password.service.ts
│   ├── auth-password.service.spec.ts      # AuthPasswordService 단위 테스트
│   ├── auth.controller.ts
│   ├── auth.controller.spec.ts            # AuthController 통합 테스트
│   ├── email-notification.service.ts
│   ├── email-notification.service.spec.ts # EmailNotificationService 단위 테스트
│   ├── email-verification.service.ts
│   ├── email-verification.service.spec.ts # EmailVerificationService 단위 테스트
│   ├── dto/
│   │   └── signup.dto.spec.ts        # SignupDto 유효성 검증 테스트
│   ├── strategies/
│   │   └── jwt.strategy.spec.ts      # JwtStrategy 단위 테스트
│   ├── clients/
│   │   ├── google-oauth.client.ts
│   │   └── google-oauth.client.spec.ts  # GoogleOAuthClient 단위 테스트
├── users/
│   ├── users.service.ts
│   ├── users.service.spec.ts         # UsersService 단위 테스트
│   ├── users.controller.ts
│   └── users.controller.spec.ts      # UsersController 통합 테스트
├── bars/
│   ├── bars.service.ts
│   ├── bars.service.spec.ts          # BarsService 단위 테스트
│   ├── bars.controller.ts
│   └── bars.controller.spec.ts       # BarsController 통합 테스트
├── photos/
│   ├── photos.service.ts
│   ├── photos.service.spec.ts        # PhotosService 단위 테스트
│   ├── photos.controller.ts
│   └── photos.controller.spec.ts     # PhotosController 통합 테스트
├── bookmarks/
│   ├── bookmarks.service.ts
│   ├── bookmarks.service.spec.ts     # BookmarksService 단위 테스트
│   ├── bookmarks.controller.ts
│   └── bookmarks.controller.spec.ts  # BookmarksController 통합 테스트
├── search/
│   ├── search.service.ts
│   ├── search.service.spec.ts        # SearchService 단위 테스트
│   ├── search.controller.ts
│   └── search.controller.spec.ts     # SearchController 통합 테스트
├── maps/
│   ├── maps.service.ts
│   ├── maps.service.spec.ts          # MapsService 단위 테스트
│   ├── maps.controller.ts
│   ├── maps.controller.spec.ts       # MapsController 통합 테스트
│   ├── address-search.service.ts
│   └── address-search.service.spec.ts # AddressSearchService 단위 테스트
├── external/
│   └── google/
│       └── clients/
│           ├── google-places.client.ts
│           └── google-places.client.spec.ts  # GooglePlacesClient 단위 테스트
├── reviews/
│   ├── reviews.service.ts
│   ├── reviews.service.spec.ts       # ReviewsService 단위 테스트
│   ├── reviews.controller.spec.ts    # ReviewsController 단위 테스트
│   └── reviews.controller.ts
├── admin/
│   ├── admin.service.ts
│   ├── admin.service.spec.ts         # AdminService 단위 테스트
│   ├── admin.controller.ts
│   └── admin.controller.spec.ts      # AdminController 통합 테스트
├── auth/guards/
│   ├── jwt-auth.guard.spec.ts        # JwtAuthGuard 테스트
│   └── roles.guard.spec.ts           # RolesGuard 테스트
backend/test/
├── auth.e2e-spec.ts              # 인증 E2E 플로우
├── bars.e2e-spec.ts              # 가게 등록/조회 E2E 플로우
├── admin.e2e-spec.ts             # 관리자 E2E 플로우
├── soft-delete.e2e-spec.ts       # Soft Delete 연쇄 E2E 플로우
├── review-reports.e2e-spec.ts   # 리뷰 신고 E2E 플로우 (RESTORE/DELETE/중복 방지/집계 정합성)
├── db-connection.spec.ts         # DB 연결 테스트
├── migration-integrity.spec.ts   # 마이그레이션 정합성 테스트
├── e2e-setup.ts                  # E2E 테스트 셋업
├── e2e-test-helper.ts            # E2E 테스트 헬퍼 (createTestApp, signupUser, loginUser, createAdminUser, createBar, createApprovedBar, uploadPhoto, createBookmark, createTestAppWithGoogleMock)
├── test-constants.ts             # 표준 테스트 데이터 상수 (TEST_USER_1, TEST_USER_2, TEST_ADMIN, TEST_BAR_DTO)
├── global-setup.ts               # Jest global setup
├── global-teardown.ts            # Jest global teardown
├── jest-e2e.json                 # E2E Jest 설정
├── test-data-source.ts           # 테스트용 DataSource 설정
└── fixtures/
    ├── test-image.jpg            # 유효한 JPEG 테스트 이미지 (업로드 성공 케이스)
    └── test-file.txt             # 무효 파일 (이미지 검증 실패 케이스)
frontend/src/components/ui/
└── star-rating.test.tsx          # StarRating 컴포넌트 테스트 (display/interactive 모드)
frontend/src/app/(main)/bars/[id]/_components/
├── review-section.test.tsx       # ReviewSection 컴포넌트 통합 테스트
├── review-card.test.tsx          # ReviewCard 컴포넌트 단위 테스트
├── review-form-modal.test.tsx    # ReviewFormModal 컴포넌트 단위 테스트
└── review-stats-summary.test.tsx # ReviewStatsSummary 컴포넌트 단위 테스트
frontend/e2e/
├── example.spec.ts               # 현재 존재하는 smoke test
└── fixtures/
    ├── auth.setup.ts             # 글로벌 인증 setup (user/admin storageState 생성)
    └── test-fixtures.ts          # authenticatedUser, authenticatedAdmin, unauthenticated 픽스처
frontend/
└── playwright.config.ts          # Playwright 설정 (testDir: ./e2e, baseURL: localhost:3000, webServer 2개)
```

추가 메모:

- `frontend/e2e/auth.spec.ts`, `bars.spec.ts`, `search.spec.ts`, `maps.spec.ts`, `bookmarks.spec.ts`, `profile.spec.ts`, `admin.spec.ts`, `cross-cutting.spec.ts`는 아직 작성 예정 항목이다.
- `backend/src/reviews/reviews.controller.spec.ts` — ReviewsController 단위 테스트 존재 (POST 생성, GET 목록/내 리뷰, PATCH 수정, DELETE 삭제, DELETE 사진 삭제).

---

## 2.1 E2E 시나리오 문서

상세 E2E 시나리오는 `docs/testing/` 아래 개별 문서에서 관리한다.

| 파일 | 내용 | 커버 엔드포인트 |
|------|------|---------------|
| [`docs/testing/infrastructure.md`](./infrastructure.md) | 백엔드/프론트엔드 E2E 인프라 설정, 헬퍼 함수, 공통 테스트 데이터 | — |
| [`docs/testing/scenarios/auth.md`](./scenarios/auth.md) | 인증/인가 시나리오 (회원가입, 로그인, OAuth, 토큰 갱신, 로그아웃) | `auth/*`, `users/me` |
| [`docs/testing/scenarios/bars.md`](./scenarios/bars.md) | 바 CRUD & 라이프사이클 시나리오 (등록, 조회, 수정, 삭제, 사진, 내 바 목록) | `bars/*` |
| [`docs/testing/scenarios/search.md`](./scenarios/search.md) | 검색 & 필터 시나리오 (키워드, 위치, 가격대, 뷰포트, 정렬, 페이지네이션) | `bars/search` |
| [`docs/testing/scenarios/maps.md`](./scenarios/maps.md) | 지도 & 길안내 시나리오 (바 상세 미니맵, 경로 탭 길안내, 근처 바, 주소 검색, 속도 제한) | `bars/nearby`, `maps/*` |
| [`docs/testing/scenarios/bookmarks.md`](./scenarios/bookmarks.md) | 북마크 시나리오 (토글, 목록, `isBookmarked` 필드) | `bars/:id/bookmark`, `users/me/bookmarks` |
| [`docs/testing/scenarios/profile.md`](./scenarios/profile.md) | 프로필 관리 시나리오 (조회, 수정, 비밀번호 변경, 이미지 업로드) | `users/me`, `users/me/password`, `users/me/profile-image` |
| [`docs/testing/scenarios/admin.md`](./scenarios/admin.md) | 관리자 기능 시나리오 (대시보드, 바/유저 관리, 감사 로그) | `admin/*` |
| [`docs/testing/scenarios/cross-cutting.md`](./scenarios/cross-cutting.md) | 횡단 관심사 시나리오 (ValidationPipe, ExceptionFilter, JWT, 소프트 삭제, 속도 제한, 토큰 갱신, 404, 에러 바운더리, 반응형) | — |
| [`docs/testing/coverage-matrix.md`](./coverage-matrix.md) | API 엔드포인트 × 테스트 파일 커버리지 매트릭스 | 전체 |

---

## 3. 스펙별 테스트 시나리오

---

### SPEC-01: 회원/인증

#### 3.1.1 AuthService 단위 테스트

```typescript
describe('AuthService', () => {

  describe('signup', () => {
    it('should create user with hashed password and return tokens')
    it('should throw ConflictException when email already exists (409)')
    it('should hash password with bcrypt saltRounds 12')
    it('should create RefreshToken record in database')
    it('should return accessToken, refreshToken, and user object')
    it('should create Account record with EMAIL provider')
    it('should throw UnauthorizedException when verificationToken is invalid or expired (401)')
    it('should throw UnauthorizedException when verificationToken purpose is not SIGNUP (401)')
    it('should throw UnauthorizedException when verificationToken email does not match request email (401)')
  })

  describe('login', () => {
    it('should return tokens and user for valid credentials')
    it('should throw UnauthorizedException when email not found (401)')
    it('should throw UnauthorizedException when password does not match (401)')
    it('should throw UnauthorizedException when passwordHash is null (social login account) (401)')
    it('should throw ForbiddenException when account is inactive (403)')
    it('should delete existing refresh tokens before creating new one')
  })

  describe('googleLogin', () => {
    it('should return tokens for existing user with valid authorization code')
    it('should create new user and account for new Google user (201)')
    it('should link Google account to existing email user and return isNewUser false')
    it('should throw UnauthorizedException for invalid authorization code (401)')
    it('should throw ForbiddenException when existing account is inactive (403)')
    it('should set passwordHash to null for social login user')
    it('should use social profile name and image for new user')
    it('should include isNewUser flag in response')
  })

  describe('refresh', () => {
    it('should return new token pair for valid refresh token')
    it('should throw UnauthorizedException for expired refresh token (401)')
    it('should throw UnauthorizedException for non-existent refresh token (401)')
    it('should delete old refresh token and create new one (Refresh Token Rotation)')
    it('should verify user isActive before issuing new tokens')
  })

  describe('logout', () => {
    it('should delete refresh token record from database')
    it('should return successfully even if token does not exist')
  })

})
```

#### 3.1.1b EmailVerificationService 단위 테스트

```typescript
describe('EmailVerificationService', () => {

  describe('sendCode', () => {
    it('should generate 6-digit code, hash it, and save to DB')
    it('should delete existing record with same email+purpose before creating new one')
    it('should set expiresAt to now + 3 minutes')
    it('should call EmailNotificationService.sendVerificationCode with correct args')
    it('should throw BadRequestException when daily send limit (5) exceeded (400)')
  })

  describe('verifyCode', () => {
    it('should return verificationToken on correct code')
    it('should mark record isUsed=true after successful verification')
    it('should throw BadRequestException when no pending record found (400)')
    it('should throw BadRequestException when code is expired (400)')
    it('should throw BadRequestException when failCount >= 5 (400)')
    it('should increment failCount on wrong code')
    it('should throw BadRequestException on wrong code (400)')
    it('should return JWT with correct payload { email, purpose, type: "email-verification" }')
    it('should return JWT with expiration of 10 minutes')
  })

  describe('validateVerificationToken', () => {
    it('should return { email, purpose } for valid token')
    it('should throw UnauthorizedException for expired token (401)')
    it('should throw UnauthorizedException when type is not "email-verification" (401)')
    it('should throw UnauthorizedException for tampered token (401)')
  })

})
```

#### 3.1.1c AuthPasswordService 단위 테스트

```typescript
describe('AuthPasswordService', () => {

  describe('resetPassword', () => {
    it('should update passwordHash and delete all refresh tokens on success')
    it('should throw UnauthorizedException for invalid verificationToken (401)')
    it('should throw UnauthorizedException when purpose is not RESET_PASSWORD (401)')
    it('should throw NotFoundException when user with token email not found (404)')
    it('should hash new password with bcrypt before saving')
  })

})
```

#### 3.1.1d GoogleOAuthClient 단위 테스트

```typescript
describe('GoogleOAuthClient', () => {

  describe('getAccessToken', () => {
    it('should POST to Google token endpoint and return access_token')
    it('should include correct params (code, client_id, client_secret, redirect_uri, grant_type)')
    it('should throw UnauthorizedException when Google returns error')
    it('should throw UnauthorizedException on network timeout')
  })

  describe('getUserProfile', () => {
    it('should GET userinfo endpoint with Bearer token and return profile')
    it('should map sub to id for backward compatibility')
    it('should throw UnauthorizedException when Google returns error')
    it('should throw UnauthorizedException on network timeout')
  })

})
```

#### 3.1.2 UsersService 단위 테스트

```typescript
describe('UsersService', () => {

  describe('getProfile', () => {
    it('should return user profile for authenticated user')
    it('should include id, email, name, profileImage, role, createdAt')
    it('should throw NotFoundException when user not found')
  })

  describe('updateProfile', () => {
    it('should update name successfully')
    it('should update profileImage successfully')
    it('should return updated user profile')
    it('should throw NotFoundException when user not found')
  })

  describe('changePassword', () => {
    it('should change password when current password matches')
    it('should throw UnauthorizedException when current password does not match (401)')
    it('should throw ForbiddenException for social login account without passwordHash (403)')
    it('should throw BadRequestException when new password equals current password (400)')
    it('should hash new password with bcrypt before saving')
    it('should throw NotFoundException when user not found')
  })

  describe('uploadProfileImage', () => {
    it('should upload file to S3 and update user profileImage')
    it('should delete old S3 image before uploading new one')
    it('should throw BadRequestException when no file provided')
    it('should throw NotFoundException when user not found')
  })

})
```

#### 3.1.3 AuthController 통합 테스트

> **[2026-03-16 업데이트]** httpOnly 쿠키 기반 인증으로 전환. 응답 본문에서 토큰 제거, Set-Cookie 헤더로 토큰 전달.
> refresh/logout 엔드포인트는 Authorization 헤더 대신 쿠키에서 refreshToken을 읽음.

```typescript
describe('AuthController', () => {

  describe('POST /api/v1/auth/signup', () => {
    it('should return 201 with user and set cookies')  // [변경] 토큰 응답 → Set-Cookie 헤더
    it('should return 400 for invalid email format')
    it('should return 400 for password without alphanumeric combination')
    it('should return 400 for password shorter than 8 characters')
    it('should return 400 for name shorter than 2 characters')
    it('should return 409 for duplicate email')
  })

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with user and set cookies')  // [변경] 토큰 응답 → Set-Cookie 헤더
    it('should return 401 for wrong email or password')
    it('should return 403 for inactive account')
  })

  describe('POST /api/v1/auth/google', () => {
    it('should return 200 for existing Google user and set cookies')  // [변경] Set-Cookie 헤더 검증 추가
    it('should return 201 for new Google user')
    it('should return 401 for invalid authorization code')
    it('should return 403 for inactive account')
  })

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 200 with success and set new cookies')  // [변경] 쿠키 기반 토큰 갱신
    it('should return 401 when no refresh token cookie')  // [변경] Authorization 헤더 → 쿠키 없음
    it('should return 401 for expired or invalid refresh token')
  })

  describe('POST /api/v1/auth/logout', () => {
    it('should return 204 and clear cookies')  // [변경] 쿠키 클리어 검증
    it('should return 204 even without refresh token cookie')  // [신규] 쿠키 없어도 204 반환
  })

})
```

#### 3.1.4 UsersController 통합 테스트

```typescript
describe('UsersController', () => {

  describe('GET /api/v1/users/me', () => {
    it('should return 200 with user profile')
    it('should return 401 when not authenticated')
  })

  describe('PATCH /api/v1/users/me', () => {
    it('should return 200 with updated profile')
    it('should return 400 for invalid name length')
    it('should return 401 when not authenticated')
  })

  describe('PATCH /api/v1/users/me/password', () => {
    it('should return 204 on successful password change')
    it('should return 400 when new password equals current')
    it('should return 401 when current password is wrong')
    it('should return 403 for social login account')
  })

  describe('POST /api/v1/users/me/profile-image', () => {
    it('should return 200 with updated user after image upload')
    it('should return 400 when no file attached')
    it('should return 401 when not authenticated')
  })

})
```

---

### SPEC-02: 가게(술집) 등록

#### 3.2.1 BarsService 단위 테스트

```typescript
describe('BarsService', () => {

  describe('create', () => {
    it('should create bar with status PENDING and return bar with relations')
    it('should set ownerId from authenticated user')
    it('should create menuItems and operatingHours in transaction')
    it('should create bar without optional fields (menuItems, operatingHours)')
  })

  describe('findOne', () => {
    it('should return bar with all relations for APPROVED status')
    it('should throw NotFoundException for non-existent bar (404)')
    it('should throw NotFoundException for non-APPROVED bar accessed by non-owner (404)')
    it('should allow owner to access PENDING/REJECTED bar')
    it('should allow admin to access any status bar')
    it('should include isBookmarked field for authenticated user')
    it('should include bookmarkCount')
  })

  describe('update', () => {
    it('should update bar fields and set status to PENDING')
    it('should update menuItems by deleting old and creating new ones')
    it('should update operatingHours by deleting old and creating new ones')
    it('should throw ForbiddenException when user is not owner (403)')
    it('should throw NotFoundException for non-existent bar (404)')
  })

  describe('create - transaction', () => {
    it('should rollback transaction when error occurs during creation')
  })

  describe('remove', () => {
    it('should soft delete bar by setting deletedAt timestamp')
    it('should throw ForbiddenException when user is not owner (403)')
    it('should throw NotFoundException for non-existent bar (404)')
  })

  describe('findMyBars', () => {
    it('should return paginated list of bars owned by user')
    it('should filter by status when provided')
  })

})
```

#### 3.2.2 PhotosService 단위 테스트

```typescript
describe('PhotosService', () => {

  describe('upload', () => {
    it('should upload photos and create BarPhoto records')
    it('should throw BadRequestException for invalid file format (400)')
    it('should throw BadRequestException for file size exceeding 5MB (400)')
    it('should throw ForbiddenException when user is not bar owner (403)')
    it('should throw NotFoundException for non-existent bar (404)')
    it('should throw BadRequestException when total photo count exceeds 5 (400)')
    it('should generate unique S3 key with pattern bars/{barId}/{uuid}.{ext}')
    it('should return only successfully uploaded photos when some uploads fail')
  })

  describe('remove', () => {
    it('should delete photo from S3 and database')
    it('should throw ForbiddenException when user is not bar owner (403)')
    it('should throw NotFoundException when photo does not exist')
    it('should throw NotFoundException when bar does not exist')
  })

})
```

#### 3.2.3 BookmarksService 단위 테스트

> **API 재설계 (2026-03-22)**: toggle() → add() / remove() 분리. 멱등성 보장 + bookmarkCount 반환.

```typescript
describe('BookmarksService', () => {

  describe('add', () => {
    // [x] 북마크가 없을 때 add()를 호출하면 새 북마크를 생성하고 isBookmarked: true를 반환한다
    // [x] add()는 항상 응답에 bookmarkCount를 포함한다
    // [x] 이미 북마크가 존재할 때 add()를 호출하면 중복 저장 없이 isBookmarked: true와 동일한 카운트를 반환한다 (멱등성)
    // [x] soft-delete된 북마크가 있을 때 add()를 호출하면 restore하고 isBookmarked: true를 반환한다
    // [x] APPROVED 상태가 아닌 바에 add()를 호출하면 NotFoundException을 던진다
  })

  describe('remove', () => {
    // [x] 활성 북마크가 있을 때 remove()를 호출하면 soft-delete하고 isBookmarked: false를 반환한다
    // [x] remove()는 항상 응답에 bookmarkCount를 포함한다
    // [x] 북마크가 존재하지 않을 때 remove()를 호출하면 softDelete 없이 isBookmarked: false를 반환한다 (멱등성)
    // [ ] APPROVED 상태가 아닌 바에 remove()를 호출하면 NotFoundException을 던진다 — 구현 미완성 (RED)
  })

  describe('findUserBookmarks', () => {
    // [x] 북마크된 바 목록을 페이지네이션하여 플래트닝된 형태로 반환한다
    // [x] reviewStats가 있으면 averageRating과 reviewCount를 포함한다
    // [x] reviewStats가 없으면 averageRating=0, reviewCount=0을 반환한다
  })

})
```

#### 3.2.5b S3Client 단위 테스트

```typescript
describe('S3Client', () => {

  describe('uploadProfilePhoto', () => {
    it('should upload to S3 with correct key format (hiddenbar/profiles/{userId}/{uuid}.{ext})')
    it('should return the S3 URL')
    it('should throw BadRequestException when S3 is not configured')
  })

})
```

#### 3.2.6 ImageValidationPipe 단위 테스트

```typescript
describe('ImageValidationPipe', () => {
  it('should pass valid JPEG file')
  it('should throw BadRequestException for invalid file format')
  it('should throw BadRequestException for file exceeding 5MB')
  it('should throw BadRequestException when magic bytes do not match mimetype')
  it('should return files as-is when array is empty')
})
```

#### 3.2.7 BarsController 통합 테스트

```typescript
describe('BarsController', () => {

  describe('POST /api/v1/bars', () => {
    it('should return 201 with created bar for valid input')
    it('should return 400 for invalid input (missing required fields)')
    it('should return 401 when not authenticated')
  })

  describe('GET /api/v1/bars/:id', () => {
    it('should return 200 with bar details for APPROVED bar')
    it('should return 401 when not authenticated')
    it('should return 404 for non-existent bar')
    it('should return 404 for non-APPROVED bar (non-owner)')
    it('should return 200 for non-APPROVED bar when requester is owner')
  })

  describe('PATCH /api/v1/bars/:id', () => {
    it('should return 200 with updated bar for owner')
    it('should return 401 when not authenticated')
    it('should return 403 when user is not owner')
    it('should return 404 for non-existent bar')
  })

  describe('DELETE /api/v1/bars/:id', () => {
    it('should return 204 on successful soft delete')
    it('should return 401 when not authenticated')
    it('should return 403 when user is not owner')
    it('should return 404 for non-existent bar')
  })

  describe('POST /api/v1/bars/:id/photos', () => {
    it('should return 201 with uploaded photos')
    it('should return 400 for invalid file format')
    it('should return 400 for file size exceeding limit')
    it('should return 401 when not authenticated')
    it('should return 403 when user is not bar owner')
  })

  describe('PUT /api/v1/bars/:id/bookmark', () => {
    it('should return 200 with isBookmarked true and bookmarkCount (add)')
    it('should return 200 with isBookmarked true and bookmarkCount (idempotent re-add)')
    it('should return 401 when not authenticated')
  })

  describe('DELETE /api/v1/bars/:id/bookmark', () => {
    it('should return 200 with isBookmarked false and bookmarkCount (remove)')
    it('should return 200 with isBookmarked false and bookmarkCount (idempotent re-remove)')
    it('should return 401 when not authenticated')
  })

})
```

---

### SPEC-03: 검색

#### 3.3.1 SearchService 단위 테스트

> **isBookmarked 추가 (2026-03-22)**: search(dto, userId?) 서명 변경. 4모드 × 2인증상태 = 8 케이스 추가.

```typescript
describe('SearchService', () => {

  describe('search - mode routing', () => {
    // [x] lat+lng+name 제공 시 combined 모드로 실행한다
    // [x] lat+lng만 제공 시 address 모드로 실행한다
    // [x] name만 제공 시 name 모드로 실행한다
    // [x] name, lat, lng 모두 없으면 general 모드(QueryBuilder)로 실행한다
  })

  describe('search - address mode (Mode 1)', () => {
    // [x] 올바른 SQL 파라미터를 전달한다 (params: [lat, lng, radiusKm*1000, limit+1, offset, userId])
    // [x] 결과 개수가 limit 초과 시 hasMore=true를 반환한다
    // [x] 결과 개수가 limit 이하이면 hasMore=false를 반환한다
    // [x] center와 radiusKm을 응답에 포함한다
    // [x] radiusKm 기본값은 5이다
  })

  describe('search - name mode (Mode 2)', () => {
    // [ ] similarity 기반으로 검색하고 후보 목록을 반환한다 (params: [name, userLat?, userLng?, userId])
    // [ ] userLat/userLng 없이 name만 제공해도 정상 검색된다
    // [ ] userLat만 있고 userLng 없으면 BadRequestException을 던진다
    // [x] 결과가 없으면 빈 배열을 반환한다
    // [x] name 앞뒤 공백을 trim한다
  })

  describe('search - combined mode (Mode 3)', () => {
    // [x] similarity와 ST_DWithin을 모두 사용한다
    // [x] 올바른 SQL 파라미터를 전달한다 (params: [name, lat, lng, radiusKm*1000, userId])
    // [x] center와 radiusKm을 응답에 포함한다
  })

  describe('search - general mode (홈페이지 호환)', () => {
    // [x] sortBy=NEWEST 시 createdAt DESC로 정렬한다
    // [x] sortBy=BOOKMARKS 시 bookmark_count_sort DESC로 정렬한다
    // [x] sortBy 미제공 시 기본값 NEWEST로 정렬한다
    // [x] sortBy=RELEVANCE 시 createdAt DESC로 폴백한다
    // [x] APPROVED 상태인 바만 조회한다
    // [x] offset과 limit을 올바르게 전달한다
    // [x] totalItems > offset+limit 시 hasMore=true를 반환한다
    // [x] totalItems <= offset+limit 시 hasMore=false를 반환한다
    // [x] 썸네일을 photos의 order 기준 첫 번째 사진에서 추출한다
  })

  describe('isBookmarked field (4모드 × 2인증상태)', () => {
    // [x] address 모드 + 인증 사용자: 북마크된 바의 isBookmarked는 true다
    // [x] name 모드 + 인증 사용자: 북마크된 바의 isBookmarked는 true다
    // [x] combined 모드 + 인증 사용자: 북마크된 바의 isBookmarked는 true다
    // [x] general 모드 + 인증 사용자: 북마크된 바의 isBookmarked는 true다
  })

})
```

#### 3.3.2 SearchController 통합 테스트

```typescript
describe('SearchController', () => {

  describe('GET /api/v1/bars/search', () => {
    it('should return 200 address mode when lat+lng provided')
    it('should return 200 name mode when only name provided')
    it('should use distance-aware ordering when userLat/userLng are also provided')
    it('should return 400 when only lat provided without lng')
    it('should return 200 combined mode when lat+lng+name provided')
    it('should return 200 general mode when no search params')
  })

})
```

---

### SPEC-04: 지도 & 길안내

#### 3.4.1 BarsService (nearby) 단위 테스트

```typescript
describe('BarsService', () => {

  describe('findNearby', () => {
    it('should return bars within specified radius sorted by distance')
    it('should only return APPROVED bars')
    it('should calculate distance using PostGIS ST_DWithin/ST_Distance')
    it('should round distanceKm to 1 decimal place')
    it('should respect the limit parameter')
    it('should respect maximum radius of 50km')
    it('should include thumbnail for each bar')
    it('should return empty array when no bars within radius')
  })

})
```

#### 3.4.2 MapsService 단위 테스트 (Google Routes API v2)

```typescript
describe('MapsService', () => {

  describe('getDirections', () => {
    it('should return parsed route with distance, duration, and steps')
    it('should strip HTML tags from step instructions')
    it('should include overview polyline')
    it('should support walking travel mode')
    it('should support transit travel mode')
    it('should support driving travel mode')
    it('should throw BadGatewayException when Google Routes API call fails (502)')
    it('should throw ServiceUnavailableException when Google Routes API quota exceeded (503)')
    it('should throw NotFoundException when no route found (ZERO_RESULTS)')
    it('should include transitDetails in FieldMask for TRANSIT mode')
    it('should NOT include transitDetails in FieldMask for non-TRANSIT modes')
    it('should transform transit step with transitDetails (역명, 시간, 노선 색상, 정류장 수)')
    it('should set step-level travelMode to WALK/TRANSIT for TRANSIT mode')
    it('should include step polyline in FieldMask for TRANSIT mode')
    it('should NOT include step polyline in FieldMask for non-TRANSIT modes')
    it('should include polylines array in TRANSIT step')
    it('should merge consecutive WALK steps in TRANSIT mode (distance/duration 합산, polylines 누적)')
    it('should NOT merge WALK steps in WALKING mode')

    // 대안 경로 (Alternative Routes)
    it('should include computeAlternativeRoutes: true in request body for TRANSIT mode')
    it('should NOT include computeAlternativeRoutes in request body for WALKING mode')
    it('should NOT include computeAlternativeRoutes in request body for DRIVING mode')
    it('should return multiple routes for TRANSIT mode when API returns alternatives')
    it('should return single route for WALKING mode even if API returns multiple')
    it('should return single route for DRIVING mode even if API returns multiple')
  })

})
```

#### 3.4.3 MapsController 통합 테스트

```typescript
describe('MapsController / BarsController (nearby)', () => {

  describe('GET /api/v1/bars/nearby', () => {
    it('should return 200 with nearby bars list')
    it('should return 400 for coordinates out of range')
    it('should return 400 for radius exceeding maximum')
    it('should return 200 with empty items when no bars nearby')
  })

  describe('GET /api/v1/maps/directions', () => {
    it('should return 200 with route directions')
    it('should return 400 for invalid coordinates')
    it('should return 400 for invalid travel mode')
    it('should return 502 when external Google Routes API fails')
    it('should return 503 when Google Routes API quota is exceeded')
  })

  describe('Rate Limiting', () => {
    it('should allow 10 requests within rate limit')
    it('should return 429 when rate limit exceeded')
    it('should return 429 for authenticated user when exceeding limit')
    // TODO: 인증/비인증 유저별 Rate Limit 구분 미구현 (현재 단일 10회/분)
  })

})
```

#### 3.4.4 경로 탭 길안내 컴포넌트 테스트

> 이전: DirectionsSheet (바 상세 사이드바). 변경 후: 경로 탭(`/directions`) 컨텍스트.

```typescript
describe('DirectionsPage', () => {
  it('should display cached bar list from search results')
  it('should show empty state when no cached bars')
  it('should render MapView with BarMarker on bar selection')
  it('should render user location marker when location available')
  it('should default to TRANSIT mode (UI default, not API default)')
  it('should render DirectionsRoute polyline when route data exists')
  it('should display DirectionsInfo with distance and duration')
  it('should update route when travel mode changes')
  it('should show permission message when location denied')
  it('should render desktop 2-column layout on lg: breakpoint')
})

describe('DirectionsInfo', () => {
  it('should show loading spinner when isLoading is true')
  it('should show error message when error exists')
  it('should show permission message when hasOrigin is false')
  it('should show "경로를 찾을 수 없습니다" when no route and hasOrigin')
  it('should display distance, duration and steps when route exists')
})

describe('DirectionsFitBounds', () => {
  it('should call map.fitBounds with origin and destination')
})
```

---

### SPEC-04b: 주소 검색 (Google Places API)

#### 3.4b.1 GooglePlacesClient 단위 테스트

```typescript
describe('GooglePlacesClient', () => {

  describe('autocomplete', () => {
    it('should POST to Places Autocomplete API and return predictions')
    it('should include X-Goog-Api-Key header')
    it('should include sessionToken in request body when provided')
    it('should include languageCode in request body when provided')
    it('should throw BadGatewayException when API call fails')
    it('should throw ServiceUnavailableException when API quota exceeded (429)')
    it('should return empty suggestions when no results')
  })

  describe('getDetails', () => {
    it('should GET Place Details API and return location + addressComponents')
    it('should include X-Goog-FieldMask header')
    it('should include sessionToken in header when provided')
    it('should throw BadGatewayException when API call fails')
    it('should throw NotFoundException when place not found')
  })

  describe('createSessionToken', () => {
    it('should return a valid UUID string')
  })

})
```

#### 3.4b.2 AddressSearchService 단위 테스트

```typescript
describe('AddressSearchService', () => {

  describe('search', () => {
    it('should call autocomplete then getDetails for each result and return formatted results')
    it('should extract city from locality addressComponent')
    it('should fallback to administrative_area_level_1 when locality not found')
    it('should extract country from country addressComponent')
    it('should return empty results when autocomplete returns no suggestions')
    it('should pass language option to autocomplete')
  })

})
```

#### 3.4b.3 MapsController 통합 테스트 (주소 검색)

```typescript
describe('MapsController (address search)', () => {

  describe('GET /api/v1/maps/address/search', () => {
    it('should return 200 with address search results')
    it('should return 400 when query is missing')
    it('should return 200 with empty results for unmatched query')
    it('should accept optional language parameter')
  })

})
```

---

### SPEC-05: 관리자

#### 3.5.1 AdminService 단위 테스트

```typescript
describe('AdminService', () => {

  describe('approveBar', () => {
    it('should change bar status to APPROVED and create AdminAction log')
    it('should throw NotFoundException for non-existent bar (404)')
    it('should throw ConflictException when bar is already APPROVED (409)')
    it('should throw ConflictException when bar status is REJECTED')
    it('should only approve bars with PENDING status')
    it('should rollback transaction when error occurs during approval')
  })

  describe('rejectBar', () => {
    it('should change bar status to REJECTED and create AdminAction log with reason')
    it('should throw NotFoundException for non-existent bar (404)')
    it('should throw ConflictException when bar is already REJECTED (409)')
    it('should throw BadRequestException when reason is not provided (400)')
  })

  describe('deleteBar', () => {
    it('should set bar deletedAt timestamp and create AdminAction log')
    it('should throw NotFoundException for non-existent bar (404)')
    it('should throw ConflictException when bar is already soft deleted (409)')
  })

  describe('suspendUser', () => {
    it('should set user isActive to false and create AdminAction log')
    it('should delete all refresh tokens of suspended user (force logout)')
    it('should throw ForbiddenException when admin tries to suspend self (403)')
    it('should throw NotFoundException for non-existent user (404)')
    it('should throw ConflictException when user is already suspended (409)')
  })

  describe('activateUser', () => {
    it('should set user isActive to true and create AdminAction log')
    it('should throw NotFoundException for non-existent user (404)')
  })

  describe('changeUserRole', () => {
    it('should change user role and create AdminAction log with metadata')
    it('should include fromRole and toRole in AdminAction metadata')
    it('should throw ForbiddenException when admin tries to change own role (403)')
    it('should throw ForbiddenException when changing role of last admin')
    it('should throw NotFoundException for non-existent user (404)')
    it('should throw ConflictException when target role equals current role (409)')
  })

  describe('getDashboardStats', () => {
    it('should return correct totalBars, pendingBars, approvedBars, rejectedBars counts')
    it('should return correct totalUsers, activeUsers, suspendedUsers counts')
    it('should return correct totalBookmarks count')
    it('should return newBarsThisWeek, newUsersThisWeek, newBookmarksThisWeek')
    it('should return correct newBookmarksThisWeek from database')
    it('should return barsByCountry top 10')
  })

  describe('getAdminActions', () => {
    it('should return paginated list of admin action logs')
    it('should filter by actionType')
    it('should filter by adminId')
    it('should filter by targetId')
  })

})
```

#### 3.5.2 AdminController 통합 테스트

```typescript
describe('AdminController', () => {

  describe('Authorization', () => {
    it('should return 403 for non-admin user on all admin endpoints')
    it('should return 401 for unauthenticated user on all admin endpoints')
  })

  describe('GET /api/v1/admin/dashboard', () => {
    it('should return 200 with dashboard statistics')
  })

  describe('GET /api/v1/admin/bars', () => {
    it('should return 200 with paginated bar list')
    it('should filter bars by status')
    it('should search bars by name/address')
  })

  describe('GET /api/v1/admin/bars/:id', () => {
    it('should return 200 with bar details including admin actions history')
    it('should return 404 for non-existent bar')
  })

  describe('PATCH /api/v1/admin/bars/:id/approve', () => {
    it('should return 200 with updated bar status APPROVED')
    it('should return 404 for non-existent bar')
    it('should return 409 when bar is already approved')
  })

  describe('PATCH /api/v1/admin/bars/:id/reject', () => {
    it('should return 200 with updated bar status REJECTED')
    it('should return 400 when reason is not provided')
    it('should return 404 for non-existent bar')
    it('should return 409 when bar is already rejected')
  })

  describe('DELETE /api/v1/admin/bars/:id', () => {
    it('should return 204 on successful admin delete')
    it('should return 404 for non-existent bar')
    it('should return 409 when bar is already deleted')
  })

  describe('GET /api/v1/admin/users', () => {
    it('should return 200 with paginated user list')
    it('should filter users by role')
    it('should filter users by isActive')
    it('should search users by email/name')
  })

  describe('PATCH /api/v1/admin/users/:id/suspend', () => {
    it('should return 200 with user isActive false')
    it('should return 400 when reason is not provided')
    it('should return 403 when admin tries to suspend self')
    it('should return 404 for non-existent user')
    it('should return 409 when user is already suspended')
  })

  describe('PATCH /api/v1/admin/users/:id/activate', () => {
    it('should return 200 with user isActive true')
    it('should return 404 for non-existent user')
  })

  describe('PATCH /api/v1/admin/users/:id/role', () => {
    it('should return 200 with updated user role')
    it('should return 403 when admin tries to change own role')
    it('should return 404 for non-existent user')
    it('should return 409 when target role equals current role')
  })

  describe('GET /api/v1/admin/actions', () => {
    it('should return 200 with paginated admin action logs')
    it('should filter by actionType')
  })

})
```

---

### Soft Delete Cascade Tests

```typescript
describe('SoftDeleteCascadeSubscriber', () => {

  describe('User soft delete cascade', () => {
    it('should cascade soft delete accounts when user is soft deleted')
    it('should cascade soft delete refresh_tokens when user is soft deleted')
    it('should cascade soft delete bars when user is soft deleted')
    it('should cascade soft delete bookmarks when user is soft deleted')
    it('should NOT soft delete admin_actions when user is soft deleted')
  })

  describe('Bar soft delete cascade', () => {
    it('should cascade soft delete bar_photos when bar is soft deleted')
    it('should cascade soft delete menu_items when bar is soft deleted')
    it('should cascade soft delete operating_hours when bar is soft deleted')
    it('should cascade soft delete bookmarks when bar is soft deleted')
  })

})
```

---

### Common 모듈: PaginationDto 테스트

> 스펙 파일: `backend/src/common/dto/pagination.dto.spec.ts`

```typescript
describe('PaginationDto', () => {
  it('should use default values when no input is provided')
  it('should accept valid page and limit')
  it('should reject page less than 1')
  it('should reject limit less than 1')
  it('should reject limit greater than 50')
  it('should accept limit of exactly 50')
  it('should reject non-integer page')
  it('should reject non-integer limit')
})
```

### Common 모듈: 전역 예외 필터 & ConfigModule 테스트

```typescript
// 스펙 파일: backend/src/common/filters/all-exceptions.filter.spec.ts
describe('AllExceptionsFilter', () => {
  // HttpException 처리 (기존)
  it('should return structured response for string exception')
  it('should return merged response for object exception')
  it('should call logger.error for 500 errors')
  it('should call logger.warn for non-5xx errors')
  it('should set correct status code on response for 400')
  it('should set correct status code on response for 401')
  it('should set correct status code on response for 403')
  it('should set correct status code on response for 404')
  it('should set correct status code on response for 500')
  // Unknown 예외 처리 (신규)
  it('should return 500 for plain Error')
  it('should return 500 for TypeError')
  it('should return 500 for string exception')
  it('should return 500 for null/undefined exception')
  it('should hide error details in production')
  it('should expose error details in non-production')
  it('should log stack trace for Error instances')
})

describe('ConfigService Integration', () => {
  it('should inject ConfigService and retrieve environment variables')
  it('should return typed configuration values via configuration factory')
  it('should throw error when required environment variable is missing (validation)')
})
```

---

### Guard 테스트

```typescript
describe('JwtAuthGuard', () => {
  it('should allow request with valid JWT token')
  it('should reject request without Authorization header (401)')
  it('should reject request with expired JWT token (401)')
  it('should reject request with malformed JWT token (401)')
})

describe('RolesGuard', () => {
  it('should allow ADMIN user to access admin-only endpoint')
  it('should reject USER from accessing admin-only endpoint (403)')
  it('should allow any authenticated user when no role restriction')
})

describe('BarOwnerGuard', () => {
  it('should allow bar owner to proceed')
  it('should reject non-owner with ForbiddenException (403)')
  it('should throw NotFoundException for non-existent bar (404)')
})
```

---

### 프론트엔드: Google OAuth 콜백 테스트

```typescript
describe('OAuthGoogleCallback', () => {

  describe('에러 파라미터', () => {
    it('should show "Google 인증이 취소되었습니다." toast and redirect to /login when error param exists')
  })

  describe('code 누락', () => {
    it('should show "Google 인증 코드가 없습니다." toast and redirect to /login when code is missing')
  })

  describe('CSRF state 검증', () => {
    it('should redirect to /login when state param is missing from URL')
    it('should redirect to /login when state does not match sessionStorage oauth_state')
    it('should show "인증 요청이 유효하지 않습니다. 다시 시도해주세요." toast on state mismatch')
  })

  describe('성공 콜백', () => {
    it('should call POST /auth/google with { code } on valid code + state')
    // [2026-03-16 삭제] 쿠키 기반 인증으로 전환 — 프론트엔드에서 토큰 저장 불필요
    // it('should save accessToken and refreshToken via setAccessToken/setRefreshToken')
    it('should dispatch setUser with response user data')
    it('should remove oauth_state from sessionStorage and redirect to /')
  })

  describe('API 에러', () => {
    it('should show "계정이 정지되었습니다. 관리자에게 문의하세요." toast on 403')
    it('should show "Google 인증에 실패했습니다." toast on other errors')
  })

  describe('로딩 UI', () => {
    it('should render Loader2 spinner and "Google 로그인 중..." text')
  })

})
```

---

### E2E 테스트 시나리오

```typescript
describe('Auth E2E Flow', () => {
  it('should signup -> login -> get profile -> update profile -> change password -> logout')
  it('should signup -> Google OAuth link -> login with Google')
  it('should login -> refresh token -> access protected resource')
})

describe('Bar Registration E2E Flow', () => {
  it('should login -> create bar (PENDING) -> admin approve -> bar visible in search')
  it('should login -> create bar -> upload photos -> update bar -> delete bar')
  it('should login -> bookmark bar -> get bookmarks list -> unbookmark')
})

describe('Search E2E Flow', () => {
  it('should search by keyword and return relevant results')
  it('should search with filters and return filtered results')
  it('should search with viewport bounds for map view')
})

describe('Admin E2E Flow', () => {
  it('should admin login -> view dashboard -> approve pending bar -> verify bar is searchable')
  it('should admin login -> suspend user -> verify user cannot login -> activate user')
  it('should admin login -> change user role -> verify audit log created')
})

describe('Soft Delete E2E Flow', () => {
  it('should soft delete bar -> verify bar not visible in search -> verify cascade to photos/menu/hours/bookmarks')
  it('should soft delete user -> verify cascade to accounts/tokens/bars/bookmarks -> verify admin_actions preserved')
})
```

---

### 인프라/환경 테스트

#### DB 연결 테스트

```typescript
describe('Database Connection', () => {
  it('should establish TypeORM connection to PostgreSQL successfully')
  it('should fail to start app when DATABASE_URL is invalid')
  it('should fail to start app when PostgreSQL is unreachable')
})
```

#### 마이그레이션 정합성 테스트

```typescript
describe('Migration Integrity', () => {
  it('should have no pending migrations (schema matches entities)')
  it('should run all migrations without errors on a clean database')
  it('should revert all migrations without errors (loop through all)')
  it('should produce identical schema after migration:run on fresh DB')
  // TODO: schema identity 테스트는 DB 환경 의존이므로 E2E에서 검증
})
```

> 인프라 테스트 skip 패턴: `describeIfDb = dbUrl ? describe : describe.skip` 사용

#### 환경변수 검증 테스트

```typescript
describe('Environment Variable Validation', () => {
  it('should pass with all required POSTGRES_* and JWT_SECRET variables')
  it('should throw when POSTGRES_HOST is missing')
  it('should throw when JWT_SECRET is missing')
  it('should throw when both required variables are missing')
  it('should accept optional PORT as numeric string')
  it('should accept optional JWT_ACCESS_EXPIRATION')
  it('should accept optional JWT_REFRESH_EXPIRATION')
  it('should throw when POSTGRES_HOST is empty string')
  it('should throw when JWT_SECRET is empty string')
})
```

#### E2E 테스트용 테스트 DB 설정 가이드

E2E 테스트에서는 별도의 테스트 데이터베이스를 사용한다.

- **테스트 DB명**: `hiddenbar_test`
- **설정 방법**: `backend/test/jest-e2e.json`에서 E2E 테스트 설정 관리 (globalSetup/globalTeardown에서 테스트 DB 설정)
- **테스트 전**: 마이그레이션 실행으로 스키마 생성
- **테스트 후**: 테스트 DB를 truncate하여 격리 보장
- **Docker Compose**: 테스트 DB도 `docker-compose.yml`에 정의하거나, 동일 PostgreSQL 인스턴스에 별도 DB 생성

---

## 4. 테스트 진행 체크리스트

### SPEC-01: 회원/인증

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`auth.service.spec.ts`, `auth.controller.spec.ts`)
- [x] AuthService 구현 (signup, login, googleLogin, refresh, logout)
- [x] 테스트 통과 확인 (24 tests passed)
- [x] Google 이메일 기반 계정 연동 테스트 추가 (Issue #3)
- [x] Account(EMAIL provider) 생성 검증 테스트 추가 (Issue #8)
- [x] 문서 업데이트

- [x] GoogleOAuthClient 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`google-oauth.client.spec.ts`)
- [x] GoogleOAuthClient 구현 (getAccessToken, getUserProfile)
- [x] AuthService 리팩토링 (fetch → GoogleOAuthClient 주입)
- [x] 테스트 통과 확인 (8 new + 24 existing = 32 tests passed)
- [x] 문서 업데이트

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`users.service.spec.ts`, `users.controller.spec.ts`)
- [x] UsersService 구현 (getProfile, updateProfile, changePassword)
- [x] 테스트 통과 확인 (10 + 9 tests passed)
- [x] NotFoundException 테스트 3건 추가 (getProfile, updateProfile, changePassword) (Issue #7)
- [x] 문서 업데이트

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`jwt-auth.guard.spec.ts`, `roles.guard.spec.ts`)
- [x] Guard 구현 (JwtAuthGuard, RolesGuard)
- [x] 테스트 통과 확인 (4 + 3 tests passed)
- [x] `jwt.strategy.spec.ts` 작성 (2 tests)
- [x] 문서 업데이트

#### httpOnly 쿠키 기반 인증 마이그레이션 (2026-03-16)

- [x] 백엔드: `cookie-parser` 추가 및 `CookieService` 구현
- [x] 백엔드: `AuthController` 수정 — 응답 본문 토큰 제거, `Set-Cookie` 헤더로 accessToken/refreshToken 전달
- [x] 백엔드: `JwtStrategy` 수정 — Authorization 헤더 대신 쿠키에서 accessToken 읽기
- [x] 백엔드: `RefreshTokenDto` / `LogoutDto` 삭제 (쿠키에서 직접 읽음)
- [x] 백엔드: `auth.controller.spec.ts` 업데이트 — Set-Cookie 헤더 검증, 쿠키 기반 refresh/logout 테스트
- [x] 프론트엔드: `token.ts` 교체 — `isLoggedIn()` 헬퍼만 유지 (쿠키 기반)
- [x] 프론트엔드: `api.ts` 요청 인터셉터 제거 (Authorization 헤더 주입 불필요)
- [x] 프론트엔드: `use-auth.ts` 단순화
- [x] 프론트엔드: `oauth-google-callback.tsx` 토큰 저장 로직 제거
- [x] 프론트엔드: `proxy.ts` — refreshToken 쿠키 기반 인증 확인
- [x] 프론트엔드: auth 타입 업데이트
- [x] 테스트 통과 확인 (백엔드 406 passed, 프론트엔드 36 passed — 2026-03-16)
- [x] 테스트 통과 확인 (백엔드 407 passed, 0 failed, 31 suites — 2026-03-17; RefreshToken @ManyToOne/@OneToMany 관계 추가, photos/users 컨트롤러 fixture 파일 교체로 잔여 실패 3건 해소)

### SPEC-02: 가게(술집) 등록

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`bars.service.spec.ts`, `bars.controller.spec.ts`)
- [x] BarsService 구현 (create, findOne, update, remove, findMyBars)
- [x] 테스트 통과 확인 (55 tests PASS: `bars.service.spec.ts` 33 + `bars.controller.spec.ts` 19 + `bar-owner.guard.spec.ts` 3)
- [x] BarsService.update menuItems/operatingHours 업데이트 트랜잭션 구현 (Issue #11)
- [x] 트랜잭션 롤백 테스트 추가 (Issue #14)
- [x] 문서 업데이트

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`photos.service.spec.ts`, `photos.controller.spec.ts`)
- [x] PhotosService 구현 (upload, remove)
- [x] 테스트 통과 확인 (16 tests PASS: `photos.service.spec.ts` 10 + `photos.controller.spec.ts` 6)
- [x] ImageValidationPipe 테스트 작성 (Issue #5)
- [x] 부분 업로드 실패 시나리오 테스트 추가 (Issue #12)
- [x] remove NotFoundException 테스트 추가 (Issue #13)
- [x] 문서 업데이트

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`bookmarks.service.spec.ts`, `bookmarks.controller.spec.ts`)
- [x] BookmarksService 구현 (toggle, findUserBookmarks)
- [x] 테스트 통과 확인 (10 tests PASS: `bookmarks.service.spec.ts` 4 + `bookmarks.controller.spec.ts` 6) — 2026-03-10 재실행 결과 10 tests passed
- [x] 문서 업데이트

### 북마크 API 재설계 (2026-03-22)

- [x] toggle() → add() / remove() 분리 (PUT /bars/:id/bookmark, DELETE /bars/:id/bookmark)
- [x] add/remove 멱등성 보장 + bookmarkCount 응답에 항상 포함
- [x] BookmarksService 재구현 (add: 신규/복원/멱등, remove: soft-delete/멱등)
- [x] BookmarksController 재구현 (PUT·DELETE 엔드포인트, findUserBookmarks 유지)
- [x] 테스트 통과 확인 (19 tests PASS: `bookmarks.service.spec.ts` 12 + `bookmarks.controller.spec.ts` 7) — 2026-03-22

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`bar-owner.guard.spec.ts`)
- [x] BarOwnerGuard 구현 (allow owner, reject non-owner, throw NotFoundException)
- [x] 테스트 통과 확인 (3 tests PASS: `bar-owner.guard.spec.ts`)

### SPEC-03: 검색

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`search.service.spec.ts`, `search.controller.spec.ts`)
- [x] SearchService 구현 (search, viewport bounds, filters-only)
- [x] 테스트 통과 확인 (27 tests PASS: `search.service.spec.ts` 21 + `search.controller.spec.ts` 6)
- [x] 문서 업데이트
- [x] fuzzy fallback 테스트 시나리오 작성 (5건: tsvector 0결과 시 fallback, 결과 있을 시 skip, q 없을 시 skip, 필터 동일 적용, fuzzyMatch 플래그)
- [x] SearchService fuzzy fallback 구현
- [x] 테스트 통과 확인 (32 tests PASS: `search.service.spec.ts` 26 + `search.controller.spec.ts` 6) — 2026-03-13
- [x] `search.service.spec.ts` 북마크 정렬 테스트: `bookmark_count_sort` 기대값으로 수정 완료 — 2026-03-17

### 검색 isBookmarked 추가 (2026-03-22)

- [x] SearchService.search() 서명 변경: `search(dto, userId)` — 인증 사용자 기준 `isBookmarked` 계산
- [x] SearchController: 인증된 사용자 userId 전달
- [ ] 인증 전용 정책 반영 후 search 테스트 케이스를 인증 사용자 기준으로 재정리
- [x] 테스트 통과 확인 (71 tests PASS: `search.service.spec.ts` 64 + `search.controller.spec.ts` 7) — 2026-03-22

### 검색 기능 재설계 (2026-03-18)

- [x] 검색 API 재설계: 단일 `q` 파라미터 → `name`/`lat`/`lng`/`userLat`/`userLng`/`offset` 분리
- [x] SearchService 3가지 모드 구현 (address/name/combined) + 일반 목록 모드 (홈페이지 호환)
- [x] `search.service.spec.ts` 모드별 테스트로 전면 재작성
- [x] `search.controller.spec.ts` 새 DTO에 맞게 재작성
- [x] DualSearchBar 컴포넌트 신규 구현 (`dual-search-bar.tsx`) → 2026-03-19 SearchBar로 통합 (삭제)
- [x] useSearchByAddress (useInfiniteQuery), useSearchByName (useQuery), useSearchBars (호환) 구현
- [x] SearchResponse 구조 변경: `meta`/`filters`/`fuzzyMatch` 제거 → `hasMore`/`mode`/`center`/`radiusKm`
- [x] `frontend/src/types/search.ts` 변경: `SearchFilters` 제거, `LegacySearchParams`/`SearchMode` 추가
- [x] `filter-panel.tsx`: `city`/`country` 입력 제거, 필터 단순화
- [x] `query-keys.ts`: search 키에서 `offset` 제외
- [x] `lib/adapters.ts`: `description` 필드 제거 (BarSummary 구조 변경 반영)
- [x] `1710000000000-add-trgm-gin-indexes.ts` 마이그레이션 추가 (pg_trgm, idx_bar_name_trgm, idx_bar_address_trgm)
- [x] 문서 업데이트

### SPEC-04: 지도 & 길안내

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`bars.service.spec.ts` - findNearby 추가)
- [x] BarsService.findNearby 구현 (PostGIS ST_DWithin/ST_Distance, Google Routes API v2)
- [x] 테스트 통과 확인 (bars.service: 9 new tests, bars.controller: 4 new tests)
- [x] 문서 업데이트

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`maps.service.spec.ts`, `maps.controller.spec.ts`)
- [x] MapsService 구현 (getDirections via Google Routes API v2, rate limiting via @nestjs/throttler)
- [x] 테스트 통과 확인 (maps.service: 12 tests, maps.controller: 6 tests)
- [x] Rate Limiting 테스트 3건 추가 (Issue #1)
- [x] transit 변환 테스트 3건 추가 (FIELD_MASK 동적 생성, transitDetails 변환, step-level travelMode)
- [x] 테스트 통과 확인 (maps.service: 15 tests)
- [x] step polyline + 연속 WALK 병합 테스트 5건 추가 (FieldMask polyline, polylines 배열, WALK 병합, polylines 누적, 비TRANSIT 병합 안함)
- [x] 테스트 통과 확인 (maps.service: 20 tests)
- [x] 문서 업데이트
- [x] 대안 경로(Alternative Routes) 테스트 6건 추가 (computeAlternativeRoutes 요청, 복수 routes 반환, 비TRANSIT 단일 route)
- [x] 테스트 통과 확인 (maps.service: 26 tests)
- [x] 문서 업데이트

### SPEC-05: 관리자

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`admin.service.spec.ts`, `admin.controller.spec.ts`)
- [x] AdminService 구현 (approveBar, rejectBar, deleteBar, suspendUser, activateUser, changeUserRole, getDashboard, findBars, findBarById, findUsers, findUserById, findActions)
- [x] 테스트 통과 확인 (86 tests PASS: `admin.service.spec.ts` + `admin.controller.spec.ts`) — 2026-03-09 재실행 결과 86 tests passed
- [x] approveBar PENDING 전용 검증 구현 + 테스트 (Issue #6)
- [x] newBookmarksThisWeek 실제 DB 쿼리 구현 + 테스트 (Issue #10)
- [ ] **FAIL (2026-03-22)**: `admin.service.spec.ts` getDashboard 5건 실패 — `barRepository.createQueryBuilder(...).where is not a function` / `.getRawOne is not a function`. getDashboard 내부 Promise.all 구조 변경으로 createQueryBuilder 호출 순서와 스텁 mock 순서 불일치. admin.service.spec.ts mock 재정비 필요.
- [x] 트랜잭션 롤백 테스트 추가 (Issue #14)
- [x] 마지막 ADMIN 보호 로직 구현 + 테스트 (Issue #17)
- [x] 문서 업데이트

### E2E 테스트

- [x] 테스트 시나리오 작성
- [x] E2E 테스트 환경 구성 (테스트 DB, seed 데이터, global setup/teardown, jest-e2e.json)
- [x] auth.e2e-spec.ts 작성 (signup→login→profile→password→logout flow, refresh rotation, error cases)
- [x] bars.e2e-spec.ts 작성 (create→approve→search flow, CRUD, my bars, bookmark toggle)
- [x] admin.e2e-spec.ts 작성 (dashboard, approve/reject, suspend/activate, role change, 403 authorization)
- [x] soft-delete.e2e-spec.ts 작성 (bar cascade, admin_actions 보존, withDeleted 쿼리)
- [x] 문서 업데이트

### Soft Delete

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`soft-delete-cascade.subscriber.spec.ts` — 11 tests)
- [x] SoftDeleteCascadeSubscriber 구현 (User, Bar cascade)
- [x] bars.service.ts, admin.service.ts: softDelete → softRemove 변경
- [x] 테스트 통과 확인 (312 tests PASS: 기존 290 + subscriber 13 + env validation 9)
- [x] 문서 업데이트

### 인프라/환경

- [x] DB 연결 테스트 작성 (`test/db-connection.spec.ts`)
- [x] 마이그레이션 정합성 테스트 작성 (`test/migration-integrity.spec.ts`)
- [x] 마이그레이션 전체 revert 루프로 확장 (Issue #15)
- [x] 인프라 테스트 skip 패턴 개선: describeIfDb 사용 (Issue #16)
- [x] 환경변수 검증 테스트 작성 (`src/common/config/configuration.spec.ts` — 9 tests)
- [x] E2E 테스트용 테스트 DB 설정 (`docker/init-test-db.sql`, `docker-compose.yml`, `test/test-data-source.ts`)
- [x] env.validation.ts → AppModule validate 등록
- [x] 테스트 통과 확인

### 프로필 수정 UX 개선

- [x] 테스트 시나리오 작성 (profile-edit-content.test.tsx — 8 tests)
- [x] 백엔드: S3Client.uploadProfilePhoto 테스트 작성 (s3.client.spec.ts 3 tests PASS — 2026-03-09)
- [x] 백엔드: UsersService.uploadProfileImage 테스트 작성 (users.service.spec.ts 4 tests PASS — 2026-03-09)
- [x] 백엔드: POST /users/me/profile-image 컨트롤러 테스트 작성 (users.controller.spec.ts PASS — 2026-03-09; 버그 수정: @HttpCode(HttpStatus.OK) 누락으로 201 반환되던 것 200으로 수정)
- [x] 프론트엔드: ProfileImageUploader 컴포넌트 테스트 작성 (2026-03-09 PASS)
- [x] 프론트엔드: 비밀번호 표시/숨기기 토글 테스트 작성 (2026-03-09 PASS)
- [x] 프론트엔드: 비밀번호 확인 불일치 에러 테스트 작성 (2026-03-09 PASS — confirm input 렌더링 검증; 불일치 에러 메시지 표시 시나리오는 미포함)
- [x] 프론트엔드: 뒤로가기 버튼 테스트 작성 (2026-03-09 PASS)
- [x] 프론트엔드: 제출 중 폼 비활성화 테스트 작성 (2026-03-09 PASS — fieldset disabled 패턴 검증)
- [x] 문서 업데이트 (api-spec.md, architecture.md, frontend/pages/profile.md 업데이트 완료)

### 주소 검색 (Google Places API)

- [x] 테스트 시나리오 작성
- [x] 백엔드: GooglePlacesClient 테스트 작성 (`google-places.client.spec.ts` — 13 tests)
- [x] 백엔드: GooglePlacesClient 구현 (autocomplete, getDetails, createSessionToken)
- [x] 백엔드: AddressSearchService 테스트 작성 (`address-search.service.spec.ts` — 6 tests)
- [x] 백엔드: AddressSearchService 구현 + DTO + 컨트롤러 엔드포인트
- [x] 테스트 통과 확인 (19 tests PASS — 2026-03-10)
- [x] 프론트엔드: useAddressSearch 훅 구현
- [x] 프론트엔드: AddressSearchInput 컴포넌트 구현
- [x] 프론트엔드: bar-form-step-location.tsx 수정 (주소 검색 UI + 자동 입력 + 지도 클릭 좌표 확정)
- [x] 문서 업데이트 (api-spec.md, architecture.md, test-plan.md, frontend/pages/bars.md)
- [x] 백엔드: MapsController 통합 테스트 작성 (address search — 4 tests) — 13 tests PASS (2026-03-10)
- [x] 프론트엔드: useAddressSearch 훅 테스트 작성 — 9 tests PASS (2026-03-10) → 2026-03-18 재확인 9 tests PASS
- [x] 프론트엔드: AddressSearchInput 컴포넌트 테스트 작성 — 8 tests PASS (2026-03-10) → 2026-03-18 재확인 5 tests PASS (테스트 리팩토링으로 케이스 수 변경)

### Playwright 프론트엔드 E2E (신규)

- [x] E2E 시나리오 문서 작성 (`docs/testing/infrastructure.md` ~ `docs/testing/coverage-matrix.md`)
- [ ] Playwright 설치 및 설정 (`frontend/playwright.config.ts`) — **[기존 실패]** `e2e/example.spec.ts` playwright-core 버전 불일치로 suite 실행 불가 (`Class extends value undefined` 오류)
- [ ] 인증 픽스처 구성 (storageState 기반 — unauthenticated, authenticated-user, authenticated-admin)
- [ ] e2e/auth.spec.ts 작성 (로그인, 회원가입, OAuth, 인증 상태 관리)
- [ ] e2e/bars.spec.ts 작성 (바 등록 위자드, 상세, 수정, 삭제, 내 바 목록, 사진)
- [ ] e2e/search.spec.ts 작성 (SearchBar 자동완성 드롭다운, 주소/이름/복합 검색, 가격대 필터, 더보기, 뷰 토글)
- [ ] e2e/maps.spec.ts 작성 (바 상세 미니맵, 경로 탭 길안내, 근처 바, 주소 검색)
- [ ] e2e/bookmarks.spec.ts 작성 (북마크 목록, 토글, 검색 결과 북마크)
- [ ] e2e/profile.spec.ts 작성 (프로필 조회/수정, 이미지 업로드, 비밀번호 변경)
- [ ] e2e/admin.spec.ts 작성 (대시보드, 바/유저 관리, 감사 로그, 권한 보호)
- [ ] e2e/cross-cutting.spec.ts 작성 (토큰 갱신, 404, 에러 바운더리, 반응형, 미들웨어 보호)

### 검색 페이지 위치 기반 자동 지도 범위 (2026-03-18)

- [x] `frontend/src/lib/geo-utils.ts` — `latLngToViewportBounds` 유틸 구현 (반경 km → 위경도 경계 변환) — 2026-03-18 기존 36 tests PASS, 회귀 없음
- [x] `frontend/src/lib/constants.ts` — `SEARCH_LOCATION_RADIUS_KM = 1` 상수 추가 — 2026-03-18
- [x] `frontend/src/app/(main)/search/_components/search-page-content.tsx` — `useUserLocation` 통합, 위치 획득 시 자동 viewport bounds 설정 및 위치 배너 표시 — 2026-03-18
- [x] `frontend/src/components/search/bar-map-view.tsx` — 모바일 지도 높이 `h-[30dvh]` → `h-[200px]`, md 높이 `h-[500px]` → `h-[400px]` 조정 — 2026-03-18
- [ ] `geo-utils.ts` 단위 테스트 작성 (`geo-utils.test.ts` — latLngToViewportBounds 경계값 검증)
- [ ] `search-page-content.tsx` 위치 배너 렌더링 / 자동 bounds 설정 통합 테스트 작성

### 검색 UX 통합 — SearchBar 단일화 (2026-03-19)

- [x] `use-search.ts` — `useBarNameSuggestions` 훅 추가 (바 이름 자동완성, limit=5, 2자 이상 활성화)
- [x] `search-bar.tsx` — DualSearchBar 기능 흡수하여 통합 검색바로 재구현 (자동완성 드롭다운 + 주소 칩 + 키보드 네비게이션)
- [x] `search-page-content.tsx` — DualSearchBar → SearchBar 교체
- [x] `map-search-overlay.tsx` — DualSearchBar → SearchBar 교체
- [x] `app/(main)/page.tsx` — `q` 파라미터 → `name` 파라미터로 변경, handleSearch 시그니처 변경
- [x] `dual-search-bar.tsx` — 삭제 (SearchBar로 완전 대체)
- [ ] `search-bar.test.tsx` 작성 (자동완성 드롭다운, 주소 칩, 키보드 네비게이션 테스트)

### 보안 유틸 + LocationProvider (2026-03-20)

- [x] `lib/validate-redirect.ts` — `getSafeRedirect()` 구현 (오픈 리다이렉트 방지: 외부 URL·프로토콜 포함 경로 차단 → `/` 반환)
- [x] `lib/sanitize.ts` — `sanitizeHtml()` 구현 (DOMPurify 기반 HTML 살균)
- [x] `providers/location-provider.tsx` — `LocationProvider` + `useLocationContext()` 구현 (Geolocation 중복 호출 방지, one-shot / watch 모드 지원)
- [x] `hooks/use-user-location.ts` — LocationContext fallback 패턴 적용 (Provider 내부: Context 공유, 외부: standalone 동작)
- [x] `login-form.tsx`, `signup-form.tsx` — `getSafeRedirect()` 적용으로 오픈 리다이렉트 방지
- [x] `directions-info.tsx` — `sanitizeHtml()` 적용으로 XSS 방지
- [x] `proxy.ts` — `isLoggedIn` 쿠키 체크 제거, `accessToken` 쿠키만으로 인증 판단
- [x] `app/(main)/page.tsx`, `search-page-content.tsx`, `bars/[id]/page.tsx` — `LocationProvider` 래핑으로 Geolocation 중복 요청 제거
- [x] `_components/latest-bars-list.tsx`, `_components/popular-bars-list.tsx` — dead code 삭제
- [ ] `validate-redirect.test.ts` 작성 (getSafeRedirect: 외부 URL, 프로토콜 포함, 정상 내부 경로, null 입력 케이스)
- [ ] `sanitize.test.ts` 작성 (sanitizeHtml: 스크립트 태그 제거, 허용 태그 유지 케이스)
- [ ] `location-provider.test.tsx` 작성 (LocationProvider: 위치 공유, watch 모드 전환, permission denied 처리)

### SPEC-06: 리뷰 (ReviewsService)

- [x] 테스트 시나리오 작성
- [x] 실패 테스트 작성 (`reviews.service.spec.ts` — 30 tests)
- [x] ReviewsService 구현 (create, findByBarId, findMyReview, update, remove, uploadPhotos, removePhoto)
- [x] 테스트 통과 확인 (23 tests PASS — 2026-03-20)
- [x] 응답 계약 통일 (toReviewItem/toReviewStats 헬퍼, stats 필드명 변경) + SQL 타입 캐스트 추가, 테스트 업데이트 (30 tests PASS — 2026-03-21)
- [x] 프론트엔드 리뷰 기능 구현 (ReviewSection, ReviewCard, ReviewFormModal, StarRating 등) — 2026-03-21
- [x] 프론트엔드 컴포넌트 테스트 작성 (`star-rating.test.tsx` 18 tests, `review-card.test.tsx` 24 tests, `review-stats-summary.test.tsx` 13 tests, `review-form-modal.test.tsx` 19 tests, `review-section.test.tsx` 18 tests) — 총 92 tests PASS — 2026-03-21 (정렬 기능 제거로 review-section 1 test 감소)
- [x] ReviewsController 단위 테스트 작성 (`reviews.controller.spec.ts` — POST 생성, GET 목록/내 리뷰, PATCH 수정, DELETE 삭제/사진 삭제)
- [ ] 문서 업데이트

#### 프론트엔드 리뷰 컴포넌트 테스트 시나리오 (93 tests)

**`star-rating.test.tsx`** — `frontend/src/components/ui/star-rating.test.tsx`
- display mode: role="img", aria-label에 값 포함, 버튼 없음, size 클래스 적용
- interactive mode: role="radiogroup", radio 버튼 5개, aria-label per star, onClick→onChange, aria-checked, hover preview, mouse leave 복원
- accessibility: display/interactive 모드별 aria-label 검증

**`review-card.test.tsx`** — `_components/review-card.test.tsx`
- 기본 렌더링: author name, content, visitedAt, StarRating, createdAt relative time
- avatar initials: 단일/복수 이름 처리 (최대 2글자)
- 본인 리뷰 메뉴: Edit/Delete 표시, onEdit/onDelete 호출
- 타인 리뷰: 메뉴 없음 (currentUserId 없거나 다를 때)
- 관리자 액션: Change Status/Delete 표시, onModerate/onAdminDelete 호출, status badge
- 사진: photos 있을 때 ReviewPhotoGrid 렌더링

**`review-stats-summary.test.tsx`** — `_components/review-stats-summary.test.tsx`
- 평균 별점: toFixed(1) 형식, "/ 5" 단위, totalCount (singular/plural)
- 분포 바: 5개 rating row, count 숫자, width % 계산 (count/totalCount*100)
- 0 리뷰: "—" 표시, "0 reviews", 모든 바 0% width
- className prop 전달

**`review-form-modal.test.tsx`** — `_components/review-form-modal.test.tsx`
- 신규 작성: "Write a Review" title, Submit 버튼, 필드 렌더링, Cancel→onOpenChange(false)
- 유효성 검사: rating=0 에러, content 빈값 에러, 미래 visitedAt 에러
- 수정 모드: "Edit Review" title, Update 버튼, 기존 값 pre-fill, updateReview 뮤테이션 호출
- 성공 제출: createReview 올바른 인자로 호출, 완료 후 onOpenChange(false)
- open=false: 컨텐츠 렌더링 안됨

**`review-section.test.tsx`** — `_components/review-section.test.tsx` (통합 테스트)
- 비로그인: "Log In" 버튼, 로그인 유도 텍스트, /login 네비게이션, 리뷰 목록 없음
- 로그인+리뷰 있음: review card 렌더링, stats summary, "Write a Review" 버튼
- 로그인+리뷰 없음: empty state
- 로딩: skeleton
- 내 리뷰 있음: "Edit My Review" 버튼, form modal 열림
- 페이지네이션: totalPages>1일 때 표시, 클릭 시 page 업데이트
- 삭제 확인 다이얼로그: 표시 및 deleteReview 뮤테이션 호출

#### ReviewsService 단위 테스트 세부 항목

##### create
- [x] 인증된 사용자가 APPROVED 바에 리뷰를 생성한다
- [x] 바가 없으면 404 NotFoundException
- [x] 바가 APPROVED가 아니면 404 NotFoundException
- [x] 같은 사용자 같은 바 활성 리뷰 존재 시 409 ConflictException
- [x] 리뷰 생성 시 집계(reviewCount, averageRating) 증분
- [x] DB unique violation(race condition) 시 409 ConflictException

##### findByBarId
- [x] PUBLISHED + deletedAt IS NULL만 반환한다
- [x] 페이지네이션 meta 구조를 검증한다
- [x] stats 포함을 검증한다 (totalCount, averageRating, distribution 배열)
- [x] stats가 null이면 빈 기본값을 반환한다
- [x] admin 사용자는 HIDDEN/REPORTED 리뷰도 조회 가능하다
- [x] 일반 사용자 공개 조회는 APPROVED 바에 대해서만 허용한다

##### findMyReview
- [x] 내 리뷰가 없으면 null을 반환한다
- [x] 내 리뷰가 있으면 ReviewItem 형태로 반환한다 (author, photos 포함)
- [x] user와 photos relation을 로드한다

##### update
- [x] 작성자 본인이 수정한다 (author 필드 포함 ReviewItem 반환 검증)
- [x] 타인 리뷰 수정 시 403 ForbiddenException
- [x] 삭제된 리뷰 수정 시 404 NotFoundException
- [x] 평점 변경 시 집계 보정한다
- [x] HIDDEN 리뷰 평점 변경 시 집계 보정하지 않는다

##### remove
- [x] 작성자 본인이 soft delete한다
- [x] 타인 리뷰 삭제 시 403 ForbiddenException
- [x] PUBLISHED 리뷰 삭제 시 집계(reviewCount, averageRating) 감소를 검증한다
- [x] HIDDEN 리뷰 삭제 시 집계 감소하지 않는다

##### uploadPhotos
- [x] 사진 추가 성공 + photoCount 증가
- [x] 기존 + 새 사진 합계 5장 초과 시 400 BadRequestException
- [x] PUBLISHED 리뷰 0→1 전환 시 photoReviewCount 증가
- [x] HIDDEN 리뷰 0→1 전환 시 photoReviewCount 증가하지 않는다
- [x] 사진 정렬은 sortOrder 오름차순을 유지한다

##### removePhoto
- [x] 사진 삭제 시 soft delete + photoCount 감소
- [x] PUBLISHED 리뷰 마지막 사진 삭제 시 photoReviewCount 감소
- [x] HIDDEN 리뷰 마지막 사진 삭제 시 photoReviewCount 감소하지 않는다
- [x] 사진이 없으면 404 NotFoundException
- [x] soft delete된 사진은 일반 조회 응답에서 제외한다

#### ReviewsController 통합 테스트 (미작성)

```typescript
describe('ReviewsController', () => {

  describe('POST /api/v1/reviews', () => {
    it('should return 201 with created review')
    it('should return 401 for unauthenticated user')
    it('should return 404 for non-existent or non-APPROVED bar')
    it('should return 409 when user already has a review for the bar')
  })

  describe('GET /api/v1/bars/:barId/reviews', () => {
    it('should return 200 with paginated review list and stats')
    it('should return 401 for unauthenticated user')
    it('should return only PUBLISHED reviews for regular user')
    it('should return HIDDEN reviews for admin or bar owner')
  })

  describe('GET /api/v1/bars/:barId/my-review', () => {
    it('should return 200 with review when exists')
    it('should return 200 with null when no review exists')
    it('should return 401 for unauthenticated user')
  })

  describe('PATCH /api/v1/reviews/:reviewId', () => {
    it('should return 200 with updated review for author')
    it('should return 401 for unauthenticated user')
    it('should return 403 for non-author user')
    it('should return 404 for non-existent review')
  })

  describe('DELETE /api/v1/reviews/:reviewId', () => {
    it('should return 204 for author')
    it('should return 401 for unauthenticated user')
    it('should return 403 for non-author user')
    it('should return 404 for non-existent review')
  })

  describe('POST /api/v1/reviews/:reviewId/photos', () => {
    it('should return 201 after uploading photos')
    it('should return 400 when total photos exceed max limit')
    it('should return 403 for non-author user')
  })

  describe('DELETE /api/v1/reviews/:reviewId/photos/:photoId', () => {
    it('should return 204 after deleting photo')
    it('should return 404 for non-existent photo')
    it('should return 403 for non-author user')
  })

})
```

#### 프론트엔드 리뷰 컴포넌트 테스트 (미작성)

```typescript
describe('ReviewSection', () => {
  it('should show login prompt for unauthenticated user')
  it('should render review stats and list for authenticated user')
  it('should show "Write a Review" button when user has no review')
  it('should hide "Write a Review" button when user already has a review')
  it('should open ReviewFormModal on "Write a Review" click')
  it('should render pagination when totalPages > 1')
})

describe('ReviewFormModal', () => {
  it('should render Dialog on desktop and Sheet on mobile')
  it('should validate rating is required')
  it('should validate content is required and max 2000 chars')
  it('should disable submit button while submitting')
  it('should close modal on successful submission')
  it('should pre-fill form in edit mode')
})

describe('StarRating', () => {
  it('should render 5 stars with correct filled state for display mode')
  it('should highlight stars on hover in interactive mode')
  it('should call onChange with correct rating on click')
})

describe('ReviewStatsSummary', () => {
  it('should display average rating and total count')
  it('should render distribution bars for each rating level')
})
```

### 평균 평점 노출 기능 (2026-03-21)

#### 프론트엔드: RatingBadge 컴포넌트 (`frontend/src/components/ui/rating-badge.test.tsx`)

- [x] reviewCount > 0: 별 아이콘 렌더링
- [x] reviewCount > 0: averageRating.toFixed(1) 표시
- [x] reviewCount > 0: 리뷰 수 괄호 표시 (default size)
- [x] reviewCount > 0: 정수 평점도 소수점 1자리 표시 (4 → "4.0")
- [x] reviewCount > 0: "New" 텍스트 없음
- [x] reviewCount === 0 + showEmpty=true (기본): "New" 텍스트 표시
- [x] reviewCount === 0 + showEmpty=true: 별 아이콘 없음
- [x] reviewCount === 0 + showEmpty=true: 괄호 리뷰 수 없음
- [x] reviewCount === 0 + showEmpty=false: null 반환 (아무것도 렌더링 안 함)
- [x] reviewCount === 0 + showEmpty=false: "New" 텍스트 없음
- [x] size="compact": 별 + 숫자만 표시, 리뷰 수 괄호 생략
- [x] size="default": 리뷰 수 괄호 표시 (명시적 size="default")

#### 백엔드: BarsService.findOne (`backend/src/bars/bars.service.spec.ts`)

- [x] reviewStats 있을 때: averageRating이 숫자로 반환됨 (문자열 DB 값 Number() 변환)
- [x] reviewStats 있을 때: reviewCount가 올바른 숫자로 반환됨
- [x] reviewStats가 null일 때: averageRating=0 반환
- [x] reviewStats가 null일 때: reviewCount=0 반환

#### 백엔드: SearchService 응답 매핑 (`backend/src/search/search.service.spec.ts`)

- [x] raw SQL 결과의 averageRating을 숫자로 정규화 (문자열 → number)
- [x] raw SQL 결과의 reviewCount를 숫자로 정규화 (문자열 → number)
- [x] averageRating이 null이면 0으로 정규화
- [x] reviewCount가 null이면 0으로 정규화

#### 백엔드: BookmarksService.findUserBookmarks (`backend/src/bookmarks/bookmarks.service.spec.ts`)

- [x] 북마크 목록 아이템에 averageRating/reviewCount 포함
- [x] reviewStats 있을 때 averageRating이 number 타입이며 올바른 값
- [x] reviewStats가 null일 때 averageRating=0, reviewCount=0 반환
