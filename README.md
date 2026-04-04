<div align="center">

# 🍸 HiddenBar

**Discover hidden local bars in Southeast Asia — search, explore, and get directions**

🌐 [www.hiddenbar.site](https://www.hiddenbar.site)

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![PostGIS](https://img.shields.io/badge/PostGIS-3.4-5A9B4E?style=flat-square)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?style=flat-square&logo=reactquery&logoColor=white)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2-764ABC?style=flat-square&logo=redux&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10-F69220?style=flat-square&logo=pnpm&logoColor=white)

![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-UNLICENSED-gray?style=flat-square)

[Demo](#-demo) · [Features](#-key-features) · [Architecture](#️-architecture) · [Tech Stack](#️-tech-stack) · [Getting Started](#-getting-started) · [Docs](#-documentation)

</div>

---

## 📸 Demo

<table>
<tr>
<td width="33%" align="center">
<b>Map Pin Search</b><br><br>
<video src="https://github.com/user-attachments/assets/049d559f-dd09-4efa-835f-8fdd3f1449f0" width="250" autoplay loop muted></video>
</td>
<td width="33%" align="center">
<b>Step-by-step Directions</b><br><br>
<video src="https://github.com/user-attachments/assets/e5aab041-fc77-412e-885f-b6c0d95d0042" width="250" autoplay loop muted></video>
</td>
<td width="33%" align="center">
<b>Route Alternatives</b><br><br>
<video src="https://github.com/user-attachments/assets/0570193e-f16a-46ea-a93c-93c6286744d3" width="250" autoplay loop muted></video>
</td>
</tr>
</table>

---

## ✨ Key Features

🔍 **4 Search Modes** — Find bars by address, name, combined filters, or by dropping a pin directly on the map.

🗺️ **Turn-by-turn Directions** — Get walking, transit, or driving directions with route alternatives powered by Google Routes API.

🍹 **Rich Bar Details** — Browse photos, menus with prices, operating hours, and user reviews for each bar.

📌 **Bar Registration** — Bar owners can register their venue, upload photos, and manage bar info through a dedicated dashboard.

⭐ **Bookmarks & Reviews** — Save favorite bars to your collection and leave reviews after visiting.

---

## 🏗️ Architecture

![Architecture](./docs/architecture.png)

> 📄 For detailed technical decisions, see the [Portfolio](#)

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Backend** | NestJS 11, TypeORM, Passport JWT, class-validator, Pino logger |
| **Frontend** | Next.js 16 (App Router), React 19, TanStack Query 5, Redux Toolkit 2, React Hook Form + Zod |
| **UI** | Tailwind CSS 4, shadcn/ui (Radix UI), Lucide Icons, Embla Carousel |
| **Database** | PostgreSQL 16, PostGIS 3.4 |
| **Maps / Location** | Google Maps API, Google Routes API, @vis.gl/react-google-maps |
| **Storage** | AWS S3 (@aws-sdk/client-s3) |
| **Auth** | JWT (NestJS Passport), bcrypt, Google OAuth |
| **Email** | Nodemailer, Handlebars templates |
| **Infra** | Docker Compose, Vercel (frontend), Railway (backend) |
| **Monorepo** | pnpm 10 workspaces, @my-project/shared package |
| **Testing** | Jest 30, Supertest, Testing Library, Playwright |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 10
- **Docker** (for PostgreSQL + PostGIS)

### Installation

```bash
# Clone the repository
git clone https://github.com/LSJ0621/hidden-bar.git
cd hidden-bar

# Install all dependencies (from the monorepo root)
pnpm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your own API keys (Google Maps, AWS S3, etc.)

# Start PostgreSQL with PostGIS via Docker
docker compose up -d

# Run database migrations
cd backend && pnpm migration:run && cd ..

# Start development servers
pnpm dev:backend   # Backend  → http://localhost:4000
pnpm dev:frontend  # Frontend → http://localhost:3000
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture Overview](./docs/architecture/) | System architecture, API specs, database schema |
| [Frontend Overview](./docs/architecture/frontend-overview.md) | App Router structure, components, state management |
| [API Reference](./docs/architecture/api/) | Endpoint specs by feature module |
| [Database Schema](./docs/architecture/database/) | Entity definitions, relations, PostGIS usage |
| [Testing Strategy](./docs/testing/) | Test infrastructure, coverage matrix, E2E scenarios |
| [Design System](./docs/frontend/design-system.md) | UI components, tokens, layout conventions |

---

<div align="center">

Built with ❤️ by [LSJ0621](https://github.com/LSJ0621)

</div>
