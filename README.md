# Hidden Bar

> 동남아시아의 숨은 바를 발견하고, 저장하고, 방문까지 이어지게 하는 풀스택 웹 서비스

<!-- 대표 스크린샷 또는 GIF -->
<!-- ![Hidden Bar Demo](./docs/assets/demo.gif) -->

## Tech Stack

### Frontend

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2-764ABC?logo=redux)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![shadcn/ui](https://img.shields.io/badge/shadcn/ui-4-000000)

### Backend

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![TypeORM](https://img.shields.io/badge/TypeORM-0.3-FE0803)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![PostGIS](https://img.shields.io/badge/PostGIS-3.4-5A9B4E)

### Infra & Tools

![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![AWS S3](https://img.shields.io/badge/AWS_S3-Storage-569A31?logo=amazons3)
![Google Maps](https://img.shields.io/badge/Google_Maps-API-4285F4?logo=googlemaps)
![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm)

## Features

### 🔍 바 검색

키워드, 위치, 가격대 기반으로 숨은 바를 검색합니다. 사용자 위치를 활용한 거리순 정렬을 지원합니다.

<!-- ![Search](./docs/assets/search.gif) -->

### 🗺️ 지도 & 길안내

Google Maps 기반 지도에서 바 위치를 확인하고, 실시간 길안내로 방문까지 이어집니다.

<!-- ![Directions](./docs/assets/directions.gif) -->

### 📌 바 등록 & 관리

바 오너가 직접 매장을 등록하고, 사진·메뉴·영업시간 등 상세 정보를 관리합니다.

<!-- ![Bar Registration](./docs/assets/bar-registration.gif) -->

### ⭐ 북마크 & 리뷰

마음에 드는 바를 북마크로 저장하고, 방문 후 리뷰를 남길 수 있습니다.

<!-- ![Bookmark](./docs/assets/bookmark.gif) -->

## Architecture

```
my-project/
├── frontend/          # Next.js (App Router)
├── backend/           # NestJS REST API
└── packages/
    └── shared/        # 공유 타입 & enum (@my-project/shared)
```

```
[Client] ──→ [Next.js Frontend] ──→ [NestJS API] ──→ [PostgreSQL + PostGIS]
                                         │
                                         ├──→ [AWS S3] (이미지 저장)
                                         └──→ [Google Maps API] (지도/길안내)
```

## Docs

- [시스템 개요](./docs/architecture/system-overview.md)
- [프론트엔드 구조](./docs/architecture/frontend-overview.md)
- [API 명세](./docs/architecture/api/README.md)
- [DB 구조 (ERD)](./docs/architecture/database/README.md)
- [테스트 전략](./docs/testing/strategy.md)

## Getting Started

### Prerequisites

- Node.js ≥ 22
- pnpm ≥ 10
- Docker (PostgreSQL 실행용)

### Installation

```bash
# 1. PostgreSQL 실행
docker compose up -d

# 2. 환경변수 설정
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. 의존성 설치
pnpm install

# 4. DB 마이그레이션
cd backend && pnpm migration:run && cd ..

# 5. 개발 서버 실행
pnpm dev:backend   # http://localhost:4000
pnpm dev:frontend  # http://localhost:3000
```
