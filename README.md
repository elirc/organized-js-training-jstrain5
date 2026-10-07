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

1. Create `.env` in the project root. This snapshot does not include the `.env.example` template the other docs mention, so write the file yourself. The database credentials below match the `postgres` service in `docker-compose.yml` (lines 31-33):

```bash
DATABASE_URL=postgresql://opsforge:opsforge_dev@localhost:5432/opsforge
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=change-me
NEXTAUTH_URL=http://localhost:3000
SIMULATE_DATA=true
SIMULATION_INTERVAL_MS=60000
READ_MODEL_REFRESH_INTERVAL_MS=300000
APPROVAL_EXPIRY_HOURS=24
DEFAULT_RATE_LIMIT_WINDOW_MS=3600000
LOG_LEVEL=info
```

The `app` and `worker` services in `docker-compose.yml` load this file through `env_file: .env`, and `src/lib/db/index.ts` throws `DATABASE_URL is required.` without it.

Two caveats, checked against the code. First, only `DATABASE_URL` and `REDIS_URL` are read by name in this repository; the simulation, read-model, approval, rate-limit and log-level variables are placeholders for features that are still stubs (see [`_learning/guides/config/env-example.guide.md`](_learning/guides/config/env-example.guide.md)). Second, the `localhost` hosts work when the app runs on your machine, but not inside the `app` and `worker` containers, where `localhost` is the container itself; there the hosts must be the service names `postgres` and `redis`.

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

## About this snapshot

This repository is a snapshot of [elirc/jstrain5](https://github.com/elirc/jstrain5). Its code and docs match that repo before its 2026-10 documentation pass, except that `.env.example` is missing here (see Quick Start). The doc fixes from that pass were ported and re-checked against this snapshot on 2026-10-06.
