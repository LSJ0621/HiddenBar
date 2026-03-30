# 공통 규칙 & 엔드포인트 요약

> 관련 문서: [API 인덱스](./README.md) · [DB 구조](../database.md) · [시스템 개요](../system-overview.md)

---

## 1. 공통 규칙

### 1.1 인증

Access Token은 **httpOnly 쿠키**로 전송된다. 모든 인증 필요 엔드포인트는 브라우저가 자동으로 쿠키를 전송한다. 서버는 `accessToken` 쿠키에서만 JWT를 읽는다.

```
Cookie: accessToken=<jwt>   (httpOnly)
```

- Access Token 만료: **15분** (httpOnly 쿠키, `path=/`)
- Refresh Token 만료: **7일** (httpOnly 쿠키, `path=/api/v1/auth`)
- `isLoggedIn` 쿠키: **7일** (non-httpOnly, 프론트엔드 보조 상태 확인용). 현재 프론트 라우트 보호 구현과의 정확한 사용 정합화는 후속 코드 작업 대상이다.
- 서명 알고리즘: HS256
- JWT Payload: `{ sub: userId, email, role }`

### 1.2 공통 응답 헤더

모든 응답에는 아래 헤더가 포함된다.

| 헤더명 | 설명 |
|--------|------|
| `x-request-id` | 요청 추적 ID (UUID). 요청 헤더에 `x-request-id`가 없을 때만 서버에서 UUID를 생성하고 응답 헤더에 `x-request-id`를 설정하여 반환한다. 클라이언트가 `x-request-id`를 보낸 경우 로깅용 `reqId`로만 사용되며 응답 헤더에는 포함되지 않는다. |

### 1.3 공통 페이지네이션 응답 구조

페이지네이션을 지원하는 엔드포인트는 `meta` 객체를 포함한다.

```json
{
  "items": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```

### 1.4 공통 에러 응답 구조

모든 에러 응답은 아래 형식을 따른다.

```json
{
  "statusCode": 400,
  "message": "에러 메시지 또는 유효성 검증 메시지 배열",
  "error": "Bad Request"
}
```

> 이 응답 형식은 `AllExceptionsFilter` (전역 예외 필터)에 의해 일관되게 적용된다. HttpException 외의 예상치 못한 예외도 동일한 구조(`statusCode: 500, message, error`)로 응답한다.
>
> **예외**: `/auth/refresh` 엔드포인트는 refreshToken 쿠키가 없을 때 컨트롤러에서 직접 `res.status(401)`으로 응답을 반환하므로 `AllExceptionsFilter`를 거치지 않는다. 이 경우 응답 형식은 `{ message: 'Invalid refresh token.' }`이다.

### 1.5 공통 상태 코드

| 상태코드 | 설명 |
|----------|------|
| 200 | 성공 |
| 201 | 리소스 생성 성공 |
| 204 | 성공 (응답 본문 없음) |
| 400 | 잘못된 요청 (유효성 검증 실패) |
| 401 | 미인증 (토큰 없음 또는 만료) |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 등) |
| 500 | 서버 내부 오류 |

---

## 2. 전체 엔드포인트 요약 테이블

총 **52개** 엔드포인트 (비즈니스 51개 + 인프라 1개)

### 인프라 (1개)

| 메서드 | 경로 | 인증 | 설명 | 담당 스펙 |
|--------|------|------|------|-----------|
| GET | `/` | - | 헬스 체크 | - |

### SPEC-01: 회원/인증 (12개)

| 메서드 | 경로 | 인증 | 설명 | 담당 스펙 |
|--------|------|------|------|-----------|
| POST | `/api/v1/auth/signup` | - | 이메일 회원가입 (verificationToken 필수) | SPEC-01 |
| POST | `/api/v1/auth/login` | - | 이메일 로그인 | SPEC-01 |
| POST | `/api/v1/auth/google` | - | Google OAuth 콜백 | SPEC-01 |
| POST | `/api/v1/auth/refresh` | - | 토큰 갱신 | SPEC-01 |
| POST | `/api/v1/auth/logout` | - | 로그아웃 (쿠키 삭제) | SPEC-01 |
| POST | `/api/v1/auth/email/send-code` | - | 이메일 인증 코드 발송 | SPEC-01 |
| POST | `/api/v1/auth/email/verify-code` | - | 인증 코드 검증 (verificationToken 반환) | SPEC-01 |
| POST | `/api/v1/auth/password/reset` | - | 비밀번호 재설정 (verificationToken 필수) | SPEC-01 |
| GET | `/api/v1/users/me` | Cookie | 내 프로필 조회 | SPEC-01 |
| PATCH | `/api/v1/users/me` | Cookie | 내 프로필 수정 | SPEC-01 |
| PATCH | `/api/v1/users/me/password` | Cookie | 비밀번호 변경 (로그인 상태) | SPEC-01 |
| POST | `/api/v1/users/me/profile-image` | Cookie | 프로필 이미지 업로드 | SPEC-01 |

### SPEC-02: 가게(술집) 등록 (10개)

| 메서드 | 경로 | 인증 | 설명 | 담당 스펙 |
|--------|------|------|------|-----------|
| POST | `/api/v1/bars` | Cookie | 가게 등록 | SPEC-02 |
| GET | `/api/v1/bars/:id` | Cookie | 가게 상세 조회 | SPEC-02 |
| PATCH | `/api/v1/bars/:id` | Cookie | 가게 정보 수정 (소유자만) | SPEC-02 |
| DELETE | `/api/v1/bars/:id` | Cookie | 가게 삭제 (소유자만, 소프트 삭제) | SPEC-02 |
| GET | `/api/v1/bars/my` | Cookie | 내가 등록한 가게 목록 | SPEC-02 |
| POST | `/api/v1/bars/:id/photos` | Cookie | 사진 업로드 (소유자만) | SPEC-02 |
| DELETE | `/api/v1/bars/:id/photos/:photoId` | Cookie | 사진 삭제 (소유자만) | SPEC-02 |
| PUT | `/api/v1/bars/:id/bookmark` | Cookie | 북마크 추가 (멱등) | SPEC-02 |
| DELETE | `/api/v1/bars/:id/bookmark` | Cookie | 북마크 제거 (멱등) | SPEC-02 |
| GET | `/api/v1/users/me/bookmarks` | Cookie | 내 북마크 목록 | SPEC-02 |

### SPEC-03: 검색 (1개)

| 메서드 | 경로 | 인증 | 설명 | 담당 스펙 |
|--------|------|------|------|-----------|
| GET | `/api/v1/bars/search` | Cookie | 바 검색 (이름/위치 기반 모드 검색) | SPEC-03 |

### SPEC-04: 지도 & 길안내 (3개)

> 프론트엔드 호출 컨텍스트: `/api/v1/maps/directions`는 경로 탭(`/directions`)에서 호출 (이전: 바 상세 사이드바 DirectionsSheet).

| 메서드 | 경로 | 인증 | 설명 | 담당 스펙 |
|--------|------|------|------|-----------|
| GET | `/api/v1/bars/nearby` | Cookie | 근처 바 검색 | SPEC-04 |
| GET | `/api/v1/maps/directions` | Cookie | 길안내 (Google Routes API v2 프록시) | SPEC-04 |
| GET | `/api/v1/maps/address/search` | Cookie | 주소 검색 (Google Places API v1 프록시) | SPEC-04 |

### SPEC-05: 관리자 (14개)

| 메서드 | 경로 | 인증 | 설명 | 담당 스펙 |
|--------|------|------|------|-----------|
| GET | `/api/v1/admin/dashboard` | Admin | 대시보드 통계 | SPEC-05 |
| GET | `/api/v1/admin/bars` | Admin | 가게 목록 (필터: 상태) | SPEC-05 |
| GET | `/api/v1/admin/bars/:id` | Admin | 가게 상세 (관리자 뷰) | SPEC-05 |
| PATCH | `/api/v1/admin/bars/:id/approve` | Admin | 가게 승인 | SPEC-05 |
| PATCH | `/api/v1/admin/bars/:id/reject` | Admin | 가게 거절 | SPEC-05 |
| DELETE | `/api/v1/admin/bars/:id` | Admin | 가게 삭제 | SPEC-05 |
| GET | `/api/v1/admin/users` | Admin | 유저 목록 | SPEC-05 |
| GET | `/api/v1/admin/users/:id` | Admin | 유저 상세 | SPEC-05 |
| PATCH | `/api/v1/admin/users/:id/suspend` | Admin | 유저 정지 | SPEC-05 |
| PATCH | `/api/v1/admin/users/:id/activate` | Admin | 유저 활성화 | SPEC-05 |
| PATCH | `/api/v1/admin/users/:id/role` | Admin | 유저 역할 변경 | SPEC-05 |
| GET | `/api/v1/admin/actions` | Admin | 감사 로그 목록 | SPEC-05 |
| PATCH | `/api/v1/admin/reviews/:reviewId/status` | Admin | 리뷰 상태 변경 (moderation) | SPEC-05 |
| DELETE | `/api/v1/admin/reviews/:reviewId` | Admin | 리뷰 삭제 (관리자) | SPEC-05 |

### SPEC-06: 리뷰 (7개)

| 메서드 | 경로 | 인증 | 설명 | 담당 스펙 |
|--------|------|------|------|-----------|
| POST | `/api/v1/reviews` | Cookie | 리뷰 생성 | SPEC-06 |
| GET | `/api/v1/bars/:barId/reviews` | Cookie | 바별 리뷰 목록 조회 | SPEC-06 |
| GET | `/api/v1/bars/:barId/my-review` | Cookie | 내 리뷰 조회 | SPEC-06 |
| PATCH | `/api/v1/reviews/:reviewId` | Cookie | 리뷰 수정 | SPEC-06 |
| DELETE | `/api/v1/reviews/:reviewId` | Cookie | 리뷰 삭제 (소프트 삭제) | SPEC-06 |
| POST | `/api/v1/reviews/:reviewId/photos` | Cookie | 리뷰 사진 업로드 | SPEC-06 |
| DELETE | `/api/v1/reviews/:reviewId/photos/:photoId` | Cookie | 리뷰 사진 삭제 | SPEC-06 |

### SPEC-07: 리뷰 신고 (4개)

| 메서드 | 경로 | 인증 | 설명 | 담당 스펙 |
|--------|------|------|------|-----------|
| POST | `/api/v1/reviews/:reviewId/report` | Cookie | 리뷰 신고 접수 | SPEC-07 |
| GET | `/api/v1/admin/review-reports` | Admin | 신고 목록 조회 | SPEC-07 |
| GET | `/api/v1/admin/review-reports/:reportId` | Admin | 신고 상세 조회 | SPEC-07 |
| PATCH | `/api/v1/admin/review-reports/:reportId/resolve` | Admin | 신고 처리 | SPEC-07 |

---

## 3. 인프라 엔드포인트 상세

---

#### 3.1 GET `/` — 헬스 체크

인증 불요. 서버 가동 여부를 확인하는 엔드포인트이다.

**Response** — `200 OK`

```
Hello World!
```

> Content-Type: `text/html`. Base URL(`/api/v1`) 프리픽스 없이 루트 경로에서 응답한다.
