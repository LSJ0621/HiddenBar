# 인증/인가 E2E 시나리오

## 백엔드 API E2E

### 회원가입 (`POST /api/v1/auth/signup`)


| #   | 시나리오                                | 기대 결과                                              | 기존 커버 |
| --- | ----------------------------------- | -------------------------------------------------- | ----- |
| 1   | 유효한 이메일/비밀번호/이름으로 가입                | 201 + `{user}` + 쿠키(`accessToken`, `refreshToken`) | ✅ (통합 플로우 + `signupUser` 헬퍼에서 커버) |
| 2   | 이미 존재하는 이메일로 가입                     | 409 Conflict                                       | ✅     |
| 3   | 유효하지 않은 이메일 형식 (예: `invalid-email`) | 400 Bad Request                                    | ✅     |
| 4   | 비밀번호 8자 미만 (예: `Ab1`)               | 400 Bad Request                                    | ✅     |
| 5   | 비밀번호 숫자 미포함 (예: `abcdefgh`)         | 400 Bad Request                                    | ✅     |
| 6   | 비밀번호 문자 미포함 (예: `12345678`)         | 400 Bad Request                                    | ✅     |
| 7   | 이름 2자 미만 (예: `A`)                   | 400 Bad Request                                    | ✅     |
| 8   | 이름 30자 초과                           | 400 Bad Request                                    | ✅     |
| 9   | 필수 필드(email) 누락                     | 400 Bad Request                                    | ✅     |
| 10  | 알 수 없는 필드 포함 (forbidNonWhitelisted) | 400 Bad Request                                    | ✅     |


### 로그인 (`POST /api/v1/auth/login`)


| #   | 시나리오                    | 기대 결과                                              | 기존 커버 |
| --- | ----------------------- | -------------------------------------------------- | ----- |
| 1   | 유효한 이메일/비밀번호            | 200 + `{user}` + 쿠키(`accessToken`, `refreshToken`) | ✅ (통합 플로우 + `loginUser` 헬퍼에서 커버) |
| 2   | 잘못된 비밀번호                | 401 Unauthorized                                   | ✅     |
| 3   | 존재하지 않는 이메일             | 401 Unauthorized                                   | ✅     |
| 4   | 정지된(suspended) 계정으로 로그인 | 403 Forbidden                                      | ✅     |


### Google OAuth (`POST /api/v1/auth/google`)


| #   | 시나리오                           | 기대 결과                               | 기존 커버 |
| --- | ------------------------------ | ----------------------------------- | ----- |
| 1   | 유효한 authorization code → 신규 유저 | 201 + 토큰 + 유저 생성 (provider: GOOGLE) | ✅     |
| 2   | 유효한 code → 기존 Google 유저        | 200 + 토큰 (유저 재사용)                   | ✅     |
| 3   | 유효하지 않은 code                   | 401 Unauthorized                    | ✅     |
| 4   | 기존 이메일 유저와 동일 이메일의 Google 계정   | 계정 병합 (provider 업데이트)               | ✅     |
| 5   | 정지된 계정의 Google 로그인             | 403 Forbidden                       | ✅     |


### 토큰 갱신 (`POST /api/v1/auth/refresh`)


| #   | 시나리오                                   | 기대 결과                                    | 기존 커버 |
| --- | -------------------------------------- | ---------------------------------------- | ----- |
| 1   | 유효한 refresh token (쿠키)                 | 200 + `{success: true}` + 새 토큰 쿠키 (로테이션) | ✅     |
| 2   | 만료된 refresh token                      | 401 Unauthorized                         | ✅     |
| 3   | 이미 사용된(rotated) refresh token → 재사용 공격 | 401 + 해당 유저 전체 refresh token 무효화         | ✅     |
| 4   | 유효하지 않은(변조된) refresh token             | 401 Unauthorized                         | ✅     |


### 로그아웃 (`POST /api/v1/auth/logout`)


| #   | 시나리오                         | 기대 결과                             | 기존 커버 |
| --- | ---------------------------- | --------------------------------- | ----- |
| 1   | 인증된 유저 로그아웃                  | 204 No Content + refresh token 삭제 | ✅     |
| 2   | 로그아웃 후 기존 refresh token으로 갱신 | 401 Unauthorized                  | ✅     |


### 프로필 조회 (`GET /api/v1/users/me`)


| #   | 시나리오             | 기대 결과                                                      | 기존 커버 |
| --- | ---------------- | ---------------------------------------------------------- | ----- |
| 1   | 인증된 유저 프로필 조회    | 200 + `{id, email, name, role, profileImage, hasPassword}` | ✅     |
| 2   | 미인증 요청           | 401 Unauthorized                                           | ✅     |
| 3   | 만료된 access token | 401 Unauthorized                                           | ✅     |
| 4   | 변조된 JWT          | 401 Unauthorized                                           | ✅     |


---

## 프론트엔드 브라우저 E2E

### 로그인 페이지 (`/login`)


| #   | 시나리오        | 검증 항목                                                                                        | 상태 |
| --- | ----------- | -------------------------------------------------------------------------------------------- | --- |
| 1   | 페이지 렌더링     | `login-email-input`, `login-password-input`, `login-submit-button`, `google-login-button` 노출 | ✅ |
| 2   | 회원가입 링크     | `/signup`으로 이동하는 링크 존재                                                                       | ✅ |
| 3   | 이메일 로그인 성공  | 폼 입력 → 제출 → `/`로 리다이렉트 → 헤더에 유저 이름 표시                                                        | ✅ |
| 4   | 잘못된 비밀번호    | 에러 메시지 표시 (`auth-error-message`)                                                             | ✅ |
| 5   | 존재하지 않는 이메일 | 에러 메시지 표시                                                                                    | ✅ |
| 6   | 정지된 계정      | 403 에러 토스트 메시지                                                                               | ✅ |
| 7   | 빈 이메일로 제출   | 인라인 유효성 에러                                                                                   | ✅ |
| 8   | 빈 비밀번호로 제출  | 인라인 유효성 에러                                                                                   | ✅ |
| 9   | 로딩 상태       | 제출 시 버튼 스피너 + disabled                                                                       | ✅ |


### 회원가입 페이지 (`/signup`)

> 3단계 이메일 인증 플로우: (1) 이메일 입력 → 인증 코드 발송, (2) 코드 검증, (3) 이름/비밀번호 입력 → 가입 완료


| #   | 시나리오            | 검증 항목                                                                       | 상태 |
| --- | --------------- | --------------------------------------------------------------------------- | --- |
| 1   | Step 1 렌더링      | `signup-email-input`, `signup-send-code-button` 노출                          | ✅ |
| 2   | Step 1 이메일 제출   | 유효한 이메일 입력 → `signup-send-code-button` 클릭 → Step 2로 전환                      | ✅ |
| 3   | Step 2 렌더링      | `signup-code-input`, `signup-verify-code-button`, `signup-resend-button` 노출 | ✅ |
| 4   | Step 2 코드 검증    | 6자리 코드 입력 → `signup-verify-code-button` 클릭 → Step 3으로 전환                    | ✅ |
| 5   | Step 3 렌더링      | `signup-name-input`, `signup-password-input`, `signup-submit-button` 노출     | ✅ |
| 6   | 회원가입 성공         | Step 3에서 이름/비밀번호 입력 → `signup-submit-button` 클릭 → `/`로 리다이렉트                | ✅ |
| 7   | 유효하지 않은 이메일 형식  | Step 1에서 인라인 에러                                                             | ✅ |
| 8   | 짧은 비밀번호 (8자 미만) | Step 3에서 인라인 에러                                                             | ✅ |
| 9   | 숫자 미포함 비밀번호     | Step 3에서 인라인 에러                                                             | ✅ |
| 10  | 짧은 이름 (2자 미만)   | Step 3에서 인라인 에러                                                             | ✅ |
| 11  | 중복 이메일          | Step 1에서 409 에러 메시지 표시                                                      | ✅ |
| 12  | 로그인 페이지 링크      | `/login`으로 이동하는 링크 존재                                                       | ✅ |


### 비밀번호 재설정 폼 (`/reset-password`) — 컴포넌트 단위 테스트

테스트 파일: `frontend/src/app/(auth)/reset-password/_components/reset-password-form.test.tsx`


| #   | 시나리오                                            | 검증 항목                                                                   | 상태  |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------- | --- |
| 1   | 미등록 이메일 제출 (sendCode가 에러 문자열 반환)                | `reset-email-input` 필드 아래 'No account found with this email.' 인라인 에러 노출 | [x] |
| 2   | 유효한 이메일 제출 (sendCode가 null 반환 → step이 code로 전환) | `reset-code-input`, `reset-verify-code-button` 노출 (이메일 폼 사라짐)           | [x] |


### Google OAuth


| #   | 시나리오             | 검증 항목                                                      | 상태 |
| --- | ---------------- | ---------------------------------------------------------- | --- |
| 1   | Google 로그인 버튼 클릭 | Google 인증 URL로 이동 (client_id, redirect_uri, state 파라미터 포함) | ✅ |
| 2   | state 파라미터       | sessionStorage에 CSRF state 저장 확인                           | ✅ |


### 인증 상태 관리


| #   | 시나리오                 | 검증 항목                                 | 상태 |
| --- | -------------------- | ------------------------------------- | --- |
| 1   | 인증된 유저가 `/login` 방문  | `/`로 리다이렉트                            | ✅ |
| 2   | 인증된 유저가 `/signup` 방문 | `/`로 리다이렉트                            | ✅ |
| 3   | 세션 유지                | 로그인 → 페이지 새로고침 → 인증 상태 유지 (헤더에 유저 이름) | ✅ |
| 4   | 로그아웃                 | 헤더 로그아웃 클릭 → `/login`으로 이동            | ✅ |
| 5   | 로그아웃 후 보호 경로         | `/bookmarks` 접근 → `/login` 리다이렉트      | ✅ |


