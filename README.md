# OpsForge

OpsForge is an internal operations dashboard for NovaCom (fictional telecom/SaaS company).

This repository currently includes:

- Next.js 14 app-router project scaffolding
- Dense internal admin shell (sidebar + header + module routes)
- Auth foundation with NextAuth v5 credentials provider + RBAC helpers
- Drizzle ORM PostgreSQL schema foundation across major domains
- API route scaffolding with envelope responses (`{ success, data/error }`)
- Docker Compose stack (`app`, `worker`, `postgres`, `redis`)

## Quick Start

1. Copy env template:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Start local stack:

```bash
docker compose up -d postgres redis
npm run dev
```

4. Optional worker:

```bash
npm run worker
```

## Database

- Schema source: `src/lib/db/schema.ts`
- Drizzle config: `drizzle.config.ts`
- Generate migrations: `npm run db:generate`
- Run migrations: `npm run db:migrate`

## Auth

- Login route: `/login`
- Auth route handler: `/api/auth/[...nextauth]`
- Demo password for seeded operators: `password123`

## Implementation Status

This codebase is structured for the full multi-phase build prompt and currently ships a strong Phase 1 + scaffolding baseline. Domain implementations (execution engines, real DB-backed queries, full simulations, and complete seeded datasets) are scaffolded and ready to be filled in phase-by-phase.
