# Hidden Bar - 프론트엔드 구조

> 이 문서는 현재 프론트엔드 구조의 정본이다.
> 제품 정책상 홈 화면 `/`만 공개하고, 검색/상세/지도 기능은 인증 사용자에게 제공한다.

## 1. 현재 기준 요약

| 항목 | 값 |
|------|-----|
| 프레임워크 | Next.js App Router |
| 상태 관리 | Redux Toolkit + React Query |
| HTTP | Axios |
| 폼 | react-hook-form + zod |
| 지도 | Google Maps 기반 |
| 라우트 보호 | `frontend/src/proxy.ts` |

## 2. 제품 정책과 현재 구현

### 2.1 확정 정책

- 홈 화면 `/`만 공개한다.
- `/search`와 `/bars/[id]`는 인증 사용자 전용이다.
- `/bars/[id]`는 인증 사용자 전용이다.
- 길안내는 검색 결과에서 "길안내 받기" 버튼으로 경로 탭(`/directions`)에서 제공하며, 바 상세 사이드바에서도 DirectionsSheet를 통해 길안내 진입이 가능하다.
- 검색 지도 뷰는 검색 결과 마커 + 사용자 위치만 표시하며, 길안내 기능을 포함하지 않는다.
- 경로 탭 UI에서 대중교통(TRANSIT)이 기본 이동 수단이다 (API 기본값 WALKING과는 별개).
- 인증 사용자 공통 네비게이션은 Home, Search, Directions를 노출한다 (데스크탑: Header + Footer, 모바일: BottomTabBar).
- 리뷰 기능은 바 상세 경험의 일부이며 v1 범위에 포함된다.
- `category`는 제거된 레거시 개념이다.

### 2.2 현재 구현 메모

- 바 상세 화면 컴포넌트와 리뷰 관련 UI/훅은 이미 프론트 구조 안에 존재한다.
- `proxy.ts`는 `/bars/new`, `/bars/[id]`, `/bars/[id]/edit`, `/my-bars`, `/profile`, `/profile/edit`, `/bookmarks`, `/search`, `/directions`, `/admin`를 보호한다.
- 프론트 라우트 보호 코드는 정책 기준과 일치한다.

## 3. 주요 라우트

| 경로 | 정책 기준 | 현재 프론트 역할 |
|------|-----------|------------------|
| `/` | 공개 | 홈 진입 |
| `/login` | 게스트 전용 (인증 시 / 리다이렉트) | 로그인 |
| `/signup` | 게스트 전용 (인증 시 / 리다이렉트) | 회원가입 |
| `/search` | 인증 필요 | 검색 결과 + 지도 뷰 (결과 마커 + 사용자 위치만) + "길안내 받기" CTA |
| `/directions` | 인증 필요 | 경로 탭 — 검색 결과 바 목록 캐시 + 개별 길안내 |
| `/bars/new` | 인증 필요 | 바 등록 |
| `/bars/[id]` | 인증 필요 | 바 상세 + 리뷰 + 위치 미니맵 + DirectionsSheet (길안내 진입) |
| `/bars/[id]/edit` | 인증 필요 | 바 수정 |
| `/my-bars` | 인증 필요 | 내 바 목록 |
| `/profile` | 인증 필요 | 프로필 |
| `/profile/edit` | 인증 필요 | 프로필 수정 |
| `/bookmarks` | 인증 필요 | 북마크 목록 |
| `/admin` | 인증 필요 + client-side role redirect (AdminSidebar) | 대시보드 |
| `/admin/bars` | 인증 필요 + client-side role redirect (AdminSidebar) | 바 관리 목록 |
| `/admin/bars/[id]` | 인증 필요 + client-side role redirect (AdminSidebar) | 바 관리 상세 |
| `/admin/users` | 인증 필요 + client-side role redirect (AdminSidebar) | 유저 관리 목록 |
| `/admin/users/[id]` | 인증 필요 + client-side role redirect (AdminSidebar) | 유저 관리 상세 |
| `/admin/actions` | 인증 필요 + client-side role redirect (AdminSidebar) | 감사 로그 |
| `/admin/review-reports` | 인증 필요 + client-side role redirect (AdminSidebar) | 리뷰 신고 관리 목록 |
| `/admin/review-reports/[id]` | 인증 필요 + client-side role redirect (AdminSidebar) | 리뷰 신고 관리 상세 |
| `/oauth/google/redirect` | 공개 | Google OAuth 콜백 리다이렉트 처리 |
| `/reset-password` | 게스트 전용 | 비밀번호 재설정 |

## 4. 프론트 구조 포인트

- 인증 상태는 쿠키와 클라이언트 상태를 함께 사용한다.
- 바 상세 화면에는 리뷰 목록, 리뷰 작성/수정/삭제, 관리자 리뷰 액션 UI가 연결되어 있다.
- 바 상세 사이드바에서 DirectionsSheet를 유지하여 길안내 진입이 가능하다 (데스크탑/모바일 공통). 미니맵과 연락처 정보(Contact card, `hidden lg:block`)도 유지.
- 하단 탭 바의 "Map" 탭이 "경로" 탭으로 변경되어 독립 라우트(`/directions`)를 가짐.
- 경로 탭은 검색 결과 바를 캐시하여 목록으로 보여주고, 개별 바 클릭 시 대중교통(UI 기본) 길안내를 표시.
- 검색 타입과 훅은 현재 이름/위치 기반 검색 계약을 따른다.
- 검색 화면에서는 현재 위치 기반 주변 추천과 명시적 위치 검색을 함께 다룬다.
- 검색 화면(`search-page-content.tsx`)은 지도 패널(`search-map-panel.tsx`), InfoWindow(`selected-bar-info-window.tsx`), 결과 리스트(`search-results-panel.tsx`)로 분리되어 있으며, 온보딩 연동은 `hooks/use-search-onboarding.ts`, 스크롤 복원은 `hooks/use-scroll-restoration.ts`에 위치한다.
- 검색 바(`components/search/search-bar.tsx`)는 주소 입력(`address-input.tsx`), 바 이름 입력(`name-input.tsx`), 각각의 로직 훅(`hooks/use-address-field.ts`, `hooks/use-name-field.ts`)으로 분할되어 있다.
- `category` 관련 레거시 타입/컴포넌트가 일부 남아 있을 수 있으나, SoT 기준 활성 개념은 아니다.

### 4.1 공통 유틸리티

| 파일 | 역할 |
|------|------|
| `lib/error-utils.ts` | `showErrorToast(error, fallback)` — AxiosError 판별 + toast.error 통합. 8개 파일에서 공유 |
| `lib/format-utils.ts` | `formatDistance(km)` — 거리 포매팅 유틸 |
| `components/ui/password-input.tsx` | 비밀번호 표시/숨기기 토글이 포함된 Input 컴포넌트. 4개 폼에서 공유 |
| `components/auth/email-verification-steps.tsx` | 이메일 인증 2단계(이메일 입력 → 코드 인증 + 재전송 Dialog) 공통 UI. signup-form과 reset-password-form에서 공유 |
| `types/common.ts` → `LatLng` | `{ lat: number; lng: number }` 좌표 타입. 12개 파일에서 공유 |

## 5. 온보딩 가이드 시스템

### 5.1 개요

첫 가입 유저를 위한 인터랙티브 온보딩 가이드. 검색(4가지 탭) → 바 상세(Directions) → 길안내(실시간 위치/재탐색/클리어) 흐름을 코치마크 방식으로 안내한다. 외부 라이브러리 없이 직접 구현하며, "Modern Speakeasy" 디자인 톤(amber/charcoal/cream)에 맞춘다.

### 5.2 컴포넌트 구조

| 파일 | 역할 |
|------|------|
| `components/onboarding/onboarding-steps.ts` | 13개 스텝 정의 (target, message, placement, waitFor) |
| `components/onboarding/onboarding-provider.tsx` | React Context + 오버레이/툴팁/다이얼로그 렌더링 (상태 머신/storage는 아래 모듈로 분리) |
| `components/onboarding/onboarding-storage.ts` | persist/restore/clear 유틸 + 완료 플래그(`onboarding-completed`) 관리 |
| `components/onboarding/onboarding-state-machine.ts` | `advanceStep` 로직, `OnboardingPhase`/`OnboardingState` 타입, `initialState` |
| `components/onboarding/use-onboarding.ts` | Context 소비 훅 (`useOnboarding`) |
| `components/onboarding/onboarding-overlay.tsx` | 풀스크린 오버레이 + CSS clip-path cutout |
| `components/onboarding/onboarding-tooltip.tsx` | 위치 계산 + 메시지/버튼 tooltip |
| `components/onboarding/onboarding-dialog.tsx` | Welcome + Completion 다이얼로그 (shadcn Dialog 재사용) |
| `components/onboarding/index.ts` | Barrel export |

### 5.3 상태 머신

```
상태: idle | welcome | active | complete

idle → welcome    : 인증된 유저 + /search 첫 진입 + localStorage 미설정
welcome → active(0) : "Start Tour" 클릭
welcome → idle    : "Skip" 클릭 → localStorage 설정
active(N) → active(N+1) : waitFor 조건 충족
active(12) → complete : 마지막 스텝 완료
complete → idle   : "Done" 클릭 → localStorage 설정
active(any) → idle : "End tour" 클릭 → localStorage 설정
```

### 5.4 스토리지 키

| 키 | 스토리지 | 용도 |
|----|---------|------|
| `onboarding-completed` | localStorage | 영구 완료 플래그 |
| `onboarding-state` | sessionStorage | 페이지 이동 간 phase/step 유지 |

### 5.5 스텝 구성 (13 Steps, 3 Phases)

- **Phase 1** (Step 0~6): 검색 페이지 `/search` — 4개 탭 소개, 지도 핀 드롭, Search here, 바 카드 클릭
- **Phase 2** (Step 7~9): 바 상세 `/bars/[id]` — Directions 버튼, DirectionsSheet 확인, Get Directions
- **Phase 3** (Step 10~12): 길안내 `/directions` — 사용자 위치 점, 경로 재탐색, Clear Route

### 5.6 통합 포인트

| 파일 | 변경 내용 |
|------|-----------|
| `app/(main)/layout.tsx` | `<OnboardingProvider>`로 children 감싸기 |
| `app/(main)/search/_components/search-page-content.tsx` | 탭 강제 전환, mapPin 이벤트, 탭 클릭 차단, 검색 결과 0건 시 goToStep(4) 복귀. 온보딩 관련 로직은 `hooks/use-search-onboarding.ts`로 추출됨 |
| `components/search/search-bar.tsx` | `id="search-here-button"` 추가. 내부 5분할: `address-input.tsx`, `name-input.tsx`, `hooks/use-address-field.ts`, `hooks/use-name-field.ts` |
| `app/(main)/bars/[id]/_components/bar-detail-sidebar.tsx` | `id="directions-button"`, 모바일/데스크탑 scrollIntoView |
| `components/map/directions-sheet.tsx` | `id="get-directions-button"` 추가, `onInteractOutside` 핸들러로 온보딩 요소 클릭 시 Sheet 닫힘 방지 |
| `components/map/map-view.tsx` | `relative z-0` 추가 (Google Maps compositor layer stacking context 수정) |
| `app/(main)/directions/_components/directions-page-content.tsx` | `id="clear-route-button"`, `id="user-location-dot"` 추가 |
| `app/(main)/profile/_components/profile-page-content.tsx` | "Replay Tour" 버튼 추가 |

### 5.7 waitFor 조건 타입

| 타입 | 설명 |
|------|------|
| `next` | 툴팁의 "Next" 버튼 클릭 |
| `click` | 하이라이트된 타겟 요소 클릭 |
| `mapPin` | 지도에 핀 드롭 이벤트 감지 |
| `navigation` | 페이지 이동(pathname 변경) 감지 |

## 6. 후속 코드 정합화가 필요한 항목

- 레거시 `category` 관련 프론트 타입/컴포넌트 정리
- 검색 결과에 "길안내 받기" 버튼 추가 (데스크탑/모바일 공통)

## 7. 참조 우선순위

- API 계약: [api.md](/Users/seongjae_lim/Desktop/my-project/docs/architecture/api.md)
- DB/도메인 구조: [database.md](/Users/seongjae_lim/Desktop/my-project/docs/architecture/database.md)
- 제품 범위: [prd-v1.md](/Users/seongjae_lim/Desktop/my-project/prd/prd-v1.md)
