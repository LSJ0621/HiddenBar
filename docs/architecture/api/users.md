# 사용자 프로필 API (SPEC-01)

> 관련 문서: [공통 규칙](./common.md) · [DB: 사용자](../database.md) · [테스트: 프로필](../../testing/scenarios/profile.md)

---

#### 1.1 GET `/api/v1/users/me` — 내 프로필 조회

> 인증 필요: `Cookie: accessToken`

**Response** — `200 OK`

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "사용자명",
  "profileImage": "https://...",
  "role": "USER",
  "createdAt": "2026-01-01T00:00:00Z",
  "hasPassword": true
}
```

> `hasPassword`: 이메일 가입 유저는 `true`, 소셜 로그인 전용 유저는 `false`. 프론트엔드에서 비밀번호 변경 UI 조건부 표시에 사용.

---

#### 1.2 PATCH `/api/v1/users/me` — 내 프로필 수정

> 인증 필요: `Cookie: accessToken`

**Request DTO**

```typescript
class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name?: string;

}
```

**Response** — `200 OK`

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "새사용자명",
  "profileImage": "https://...",
  "role": "USER",
  "createdAt": "2026-01-01T00:00:00Z",
  "hasPassword": true
}
```

---

#### 1.3 PATCH `/api/v1/users/me/password` — 비밀번호 변경

> 인증 필요: `Cookie: accessToken`

**Request DTO**

```typescript
class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
  newPassword: string;
}
```

**Response** — `204 No Content`

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 새 비밀번호가 기존과 동일 |
| 401 | 현재 비밀번호 불일치 |
| 403 | 소셜 로그인 전용 계정 (passwordHash가 null) |

---

#### 1.4 POST `/api/v1/users/me/profile-image` — 프로필 이미지 업로드

> 인증 필요: `Cookie: accessToken`

**Request** — `multipart/form-data`

| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | 단일 이미지 (JPEG, PNG, WebP, 최대 5MB) |

**Response** — `200 OK`

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "사용자명",
  "profileImage": "https://s3.ap-northeast-2.amazonaws.com/bucket/hiddenbar/profiles/1/uuid.jpg",
  "role": "USER",
  "createdAt": "2026-01-01T00:00:00Z",
  "hasPassword": true
}
```

**에러 케이스**

| 상태코드 | 조건 |
|----------|------|
| 400 | 파일이 첨부되지 않았거나 허용되지 않은 형식 |
| 401 | 미인증 |
