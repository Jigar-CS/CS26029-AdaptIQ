# CLIAS — System Architecture

## 1. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Client Layer
        Web["Next.js App Router (Tailwind + Recharts + shadcn/ui)"]
    end

    subgraph API & Gateway Layer
        API["NestJS Core API Gateway & Domain Services"]
        AuthMod["Auth & RBAC Module (JWT + httpOnly Cookie)"]
        PracticeMod["Practice Engine & Question Bank"]
        AnalyticsMod["Learning Analytics Engine (EWMA Mastery)"]
        AdminMod["Super Admin & CSV Roster Import"]
    end

    subgraph Intelligence Layer
        FastAPI["FastAPI Python AI Microservice (Port 8000)"]
    end

    subgraph Persistence Layer
        DB[("MySQL 8.x / MariaDB Database (Prisma ORM)")]
        Cache[("Redis 7 (Session, Rate Limiting, OTP)")]
    end

    Web -->|HTTPS / REST API| API
    API --> AuthMod
    API --> PracticeMod
    API --> AnalyticsMod
    API --> AdminMod
    API -->|Prisma Client| DB
    API -->|ioredis| Cache
    API -->|HTTP / gRPC Proxy| FastAPI
```

## 2. Component Breakdown

### Frontend (`apps/web`)
- Built with **Next.js App Router** (React 18/19), **TypeScript**, **Tailwind CSS**, and **Recharts**.
- Design System: Custom SaaS aesthetic utilizing card glassmorphism, fluid responsive layouts, micro-animations, loading skeletons, and accessible states.
- Client State & Data Fetching: SWR / TanStack Query patterns with centralized Axios/Fetch API client and JWT handling.

### Backend (`apps/api`)
- Built with **NestJS**, **TypeScript**, and **Prisma ORM**.
- Layered modular architecture:
  - `AuthModule`: Domain validation, OTP generation/verification, password hashing, JWT issue/refresh.
  - `AdminModule`: Authorized student roster CSV upload, streaming validation, institutional structure CRUD.
  - `PracticeModule`: Practice session lifecycle, question retrieval (without correct answer leakage), attempt recording.
  - `AnalyticsModule`: Standalone `LearningAnalyticsService` computing EWMA topic mastery and historical curve snapshots.
  - `UsersModule`: Role queries and user profile management.

### AI Microservice (`apps/ai`)
- Built with **Python 3.10+** and **FastAPI**.
- Exposes `/health` and structured endpoints prepared for future LangChain/LlamaIndex integration, question generation, and misconception vector similarity search.

### Database (`MySQL` via Prisma)
- Strongly normalized relational data model.
- Referential integrity with foreign keys, composite unique constraints (e.g. unique enrollment numbers, unique active user emails).
