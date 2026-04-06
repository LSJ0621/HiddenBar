# 인증 API (SPEC-01)

> 관련 문서: [공통 규칙](./common.md) · [DB: 인증](../database.md) · [테스트: 인증](../../testing/scenarios/auth.md)

---

#### 1.1 POST `/api/v1/auth/signup` — 이메일 회원가입

`POST /api/v1/auth/email/send-code` → `POST /api/v1/auth/email/verify-code`로 발급받은 `verificationToken`(purpose: SIGNUP)이 필수이다.

**Request DTO**

```typescript
class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/) // 영소문자+영대문자+숫자 조합
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name: string;

  @IsString()
  verificationToken: string; // 이메일 인증 완료 후 발급된 토큰 (purpose: SIGNUP, 유효기간 10분)
}
```

**Response** — `201 Created`

`accessToken`, `refreshToken`, `isLoggedIn` 쿠키가 `Set-Cookie` 헤더로 설정된다.

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "사용자명",
    "profileImage": null,
    "role": "USER",
    "createdAt": "2026-01-01T00:00:00Z",
    "hasPassword": true
  }
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 유효성 검증 실패 (이메일 형식, 비밀번호 규칙 등) |
| 401 | 유효하지 않거나 만료된 verificationToken, 또는 purpose가 SIGNUP이 아님 |
| 401 | verificationToken의 이메일과 요청 이메일 불일치 |
| 409 | 이미 등록된 이메일 |

---

#### 1.2 POST `/api/v1/auth/login` — 이메일 로그인

**Request DTO**

```typescript
class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

**Response** — `200 OK`

`accessToken`, `refreshToken`, `isLoggedIn` 쿠키가 `Set-Cookie` 헤더로 설정된다.

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "사용자명",
    "profileImage": null,
    "role": "USER",
    "createdAt": "2026-01-01T00:00:00Z",
    "hasPassword": true
  }
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 이메일 또는 비밀번호 불일치 |
| 403 | 비활성화된 계정 (`isActive = false`) |

---

#### 1.3 POST `/api/v1/auth/google` — Google OAuth 콜백

Google OAuth redirect URI는 환경변수 `GOOGLE_REDIRECT_URI`로 설정한다. 프론트엔드 콜백 라우트는 `/oauth/google/redirect`이며, 이 페이지가 query parameter의 authorization code를 추출하여 본 엔드포인트에 `code`로 전달한다.

**Request DTO**

```typescript
class SocialLoginDto {
  @IsString()
  code: string; // OAuth authorization code
}
```

**Response** — `200 OK` (기존 유저) / `201 Created` (신규 유저)

`accessToken`, `refreshToken`, `isLoggedIn` 쿠키가 `Set-Cookie` 헤더로 설정된다.

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "사용자명",
    "profileImage": "https://...",
    "role": "USER",
    "createdAt": "2026-01-01T00:00:00Z",
    "hasPassword": false
  },
  "isNewUser": true
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 유효하지 않은 authorization code |
| 403 | 비활성화된 계정 |

---

#### 1.4 POST `/api/v1/auth/refresh` — 토큰 갱신

요청 바디 없음. `refreshToken` httpOnly 쿠키에서 자동으로 읽는다.

**Response** — `200 OK`

새로운 `accessToken`, `refreshToken`, `isLoggedIn` 쿠키가 `Set-Cookie` 헤더로 갱신된다.

```json
{
  "success": true
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 401 | 유효하지 않거나 만료된 리프레시 토큰, 또는 쿠키 없음 |

---

#### 1.5 POST `/api/v1/auth/logout` — 로그아웃

인증 불요. 요청 바디 없음. `refreshToken` httpOnly 쿠키에서 자동으로 읽어 DB에서 폐기한다. 쿠키가 없어도 정상 처리된다.

**Response** — `204 No Content`

`accessToken`, `refreshToken`, `isLoggedIn` 쿠키가 모두 삭제된다.

---

#### 1.6 POST `/api/v1/auth/email/send-code` — 이메일 인증 코드 발송

인증 불요. 회원가입 또는 비밀번호 재설정 전 이메일로 6자리 인증 코드를 발송한다.

**제한**
- 인증 코드 유효 시간: **3분**
- 일일 발송 횟수 한도: **5회** (동일 email + purpose 조합 기준)
- 기존 미사용 코드가 있으면 새 코드 발송 시 삭제 후 재생성

**Request DTO**

```typescript
class SendCodeDto {
  @IsEmail()
  email: string;

  @IsEnum(EmailVerificationPurpose)
  purpose: EmailVerificationPurpose; // 'SIGNUP' | 'RESET_PASSWORD'
}
```

**Enum 참조**: `EmailVerificationPurpose` — `./database.md` 섹션 2.11 참조

**Response** — `200 OK`

```json
{
  "success": true
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 유효성 검증 실패 (이메일 형식, purpose 값 오류) |
| 400 | 일일 발송 횟수 초과 (5회/일) |

---

#### 1.7 POST `/api/v1/auth/email/verify-code` — 인증 코드 검증

인증 불요. 발송된 6자리 코드를 검증하고 성공 시 단기 JWT `verificationToken`을 반환한다.

**제한**
- 최대 실패 횟수: **5회** (초과 시 새 코드 요청 필요)
- verificationToken 유효 시간: **10분**

**Request DTO**

```typescript
class VerifyCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string; // 6자리 숫자 코드

  @IsEnum(EmailVerificationPurpose)
  purpose: EmailVerificationPurpose; // 'SIGNUP' | 'RESET_PASSWORD'
}
```

**Response** — `200 OK`

```json
{
  "verificationToken": "<jwt>"
}
```

> `verificationToken`: payload `{ email, purpose, type: 'email-verification' }`, 유효기간 10분. 회원가입 시 `SignupDto.verificationToken`, 비밀번호 재설정 시 `ResetPasswordDto.verificationToken`으로 사용한다.

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 인증 코드 요청 이력 없음 |
| 400 | 인증 코드 만료 (3분 초과) |
| 400 | 인증 코드 불일치 |
| 400 | 인증 실패 횟수 초과 (5회) |

---

#### 1.8 POST `/api/v1/auth/password/reset` — 비밀번호 재설정

인증 불요. `POST /api/v1/auth/email/verify-code`로 발급받은 `verificationToken`(purpose: RESET_PASSWORD)으로 비밀번호를 재설정한다. 성공 시 해당 유저의 모든 Refresh Token이 삭제된다 (강제 로그아웃).

**Request DTO**

```typescript
class ResetPasswordDto {
  @IsString()
  verificationToken: string; // purpose: RESET_PASSWORD 토큰

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
  newPassword: string;
}
```

**Response** — `200 OK`

```json
{
  "success": true
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 유효성 검증 실패 (비밀번호 규칙) |
| 401 | 유효하지 않거나 만료된 verificationToken |
| 401 | verificationToken의 purpose가 RESET_PASSWORD가 아님 |
| 404 | 토큰의 이메일에 해당하는 유저 없음 |
