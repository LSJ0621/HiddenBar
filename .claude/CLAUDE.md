# Project Guide

## Overview
NestJS(backend) + Next.js(frontend) 풀스택 프로젝트. 패키지 매니저는 pnpm을 사용한다.

## Directory Structure
- `backend/` — NestJS API 서버
- `frontend/` — Next.js 웹 클라이언트
- `packages/shared/` — 공유 타입/상수 (`@my-project/shared`)

## Quick Lookup

| Feature | Frontend (`frontend/src/`) | Backend (`backend/src/`) |
|---------|---------------------------|--------------------------|
| 인증 (로그인/회원가입) | `app/(auth)/` `components/auth/` `hooks/use-auth.ts` | `auth/` |
| 홈/검색 | `app/(main)/page.tsx` `(main)/search/` `components/search/` `hooks/queries/use-search.ts` | `search/` |
| 바 (상세/등록/수정) | `app/(main)/bars/` `(main)/my-bars/` `components/bars/` `hooks/queries/use-bars.ts` | `bars/` `photos/` |
| 북마크 | `app/(main)/bookmarks/` `hooks/queries/use-bookmarks.ts` | `bookmarks/` |
| 프로필 | `app/(main)/profile/` `hooks/queries/use-profile.ts` | `users/` |
| 경로/길안내 | `app/(main)/directions/` `components/map/` `hooks/queries/use-maps.ts` | `maps/` |
| 리뷰 | — | `reviews/` `review-reports/` |
| 관리자 | `app/admin/` `components/admin/` `hooks/queries/use-admin.ts` | `admin/` |
| DB/엔티티 | — | `entities/` `migrations/` |
| API/DTO | `lib/api.ts` `lib/api-endpoints.ts` | 각 모듈 `*.dto.ts` `*.controller.ts` |
| 공유 타입/상수 | `packages/shared/src/` | same |
| 디자인 시스템/UI | `components/ui/` `components/layout/` | — |

## Tech Stack
- **Language**: TypeScript (strict mode)
- **Backend**: NestJS, TypeORM, PostgreSQL, Jest
- **Frontend**: Next.js (App Router), React, TanStack Query, Redux Toolkit, Tailwind CSS, shadcn/ui
- **Package Manager**: pnpm

## Common Commands
- `pnpm install` — 의존성 설치
- `pnpm dev:backend` / `pnpm dev:frontend` — 개발 서버
- `pnpm build` — 전체 빌드
- `pnpm test` — 전체 테스트
- `pnpm lint` — 전체 린트

## Coding Conventions
- TypeScript strict mode 사용
- 함수형 프로그래밍 스타일 선호
- 변수/함수명은 camelCase, 클래스명은 PascalCase
- 파일명은 kebab-case
- 절대 경로 import 사용 (`@/` alias)
- 모든 exported 함수에 JSDoc 주석 작성

## TDD Workflow
1. 실패하는 테스트 코드 작성 (백엔드: `*.spec.ts` / 프론트엔드: `*.test.tsx`)
2. 테스트 통과하는 최소 코드 구현
3. 리팩토링

## Framework Conventions (코드 분석 시 주의사항)
- Next.js는 file-based convention 프레임워크로, 특정 파일명을 프레임워크가 자동 인식한다. 미사용 코드 판별 시 import 추적만으로 판단하지 말고, Next.js 공식 문서의 File Conventions를 반드시 확인할 것
- NestJS는 데코레이터 + DI 기반으로 모듈이 연결되므로, 명시적 import 없이 주입되는 provider가 있을 수 있음
- 미사용 여부가 불확실한 경우 웹 검색으로 해당 프레임워크의 최신 문서를 교차 확인할 것

## References
- **Documentation Index**: @docs/README.md (읽기 순서, 정책, 디렉터리 역할)
- **Architecture**: @docs/architecture/system-overview.md · @docs/architecture/frontend-overview.md
- **API**: @docs/architecture/api/README.md (기능별 분할)
- **Database**: @docs/architecture/database/README.md (기능별 분할)
- **Testing**: @docs/testing/strategy.md · @docs/testing/infrastructure.md · @docs/testing/coverage-matrix.md
- **Design System**: @docs/frontend/design-system.md
- **PRD**: @prd/prd-v1.md · @prd/specs/ (spec-01~06)
