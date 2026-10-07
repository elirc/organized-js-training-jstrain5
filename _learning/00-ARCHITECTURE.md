# OpsForge — Master Architecture Guide

## What Is This App?

OpsForge is an **internal operations dashboard** for a fictional company called **NovaCom** — a telecom/SaaS platform. Think of it as the "mission control" that NovaCom's own employees use to manage their business. It is NOT a customer-facing app. It's the tool behind the scenes where support agents, engineers, finance folks, and managers:

- View and manage customer accounts
- Monitor infrastructure health (servers, APIs, databases)
- Handle billing disputes and credits
- Respond to incidents (outages, bugs)
- Execute operational commands (suspend a customer, rotate API keys, process refunds)
- Control feature flags (turn features on/off for specific customers)
- Follow runbooks (step-by-step procedures for common tasks)
- Review audit logs (who did what, when)

**Who uses it?** Internal NovaCom employees called "operators" — each with a specific role (super admin, ops lead, ops engineer, support, finance, viewer).

**Why does it exist?** In real companies, you can't give every employee direct database access. You need a controlled interface with permissions, audit trails, and safety checks. That's what OpsForge provides.

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Login    │  │Dashboard │  │Customers │  │ Other Pages...   │   │
│  │  Page     │  │  Page    │  │  Page    │  │ (Scaffolded)     │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │              │                  │             │
│       └──────────────┴──────────────┴──────────────────┘             │
│                              │                                       │
│                    HTTP Requests (fetch)                              │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS SERVER (Node.js)                         │
│                                                                      │
│  ┌─────────────────────────────────────────────┐                     │
│  │              MIDDLEWARE (middleware.ts)       │                    │
│  │  - Intercepts EVERY request                  │                    │
│  │  - Checks: Is user logged in?                │                    │
│  │  - If not → redirect to /login               │                    │
│  │  - Adds x-request-id header for tracing      │                    │
│  └──────────────────────┬──────────────────────┘                     │
│                         │                                            │
│           ┌─────────────┴─────────────┐                              │
│           ▼                           ▼                              │
│  ┌────────────────┐        ┌──────────────────┐                     │
│  │  PAGE ROUTES   │        │   API ROUTES      │                    │
│  │  (app/)        │        │   (app/api/)      │                    │
│  │                │        │                    │                    │
│  │  Server        │        │  GET /api/customers│                   │
│  │  Components    │        │  POST /api/ops     │                   │
│  │  render HTML   │        │  PATCH /api/...    │                   │
│  └───────┬────────┘        └────────┬───────────┘                   │
│          │                          │                                │
│          └──────────┬───────────────┘                                │
│                     │                                                │
│          ┌──────────▼──────────┐                                     │
│          │   BUSINESS LOGIC    │                                     │
│          │                     │                                     │
│          │  lib/auth/          │  ← Authentication & RBAC            │
│          │  lib/operations/    │  ← Command execution engine         │
│          │  lib/approvals/     │  ← Approval workflows               │
│          │  lib/incidents/     │  ← Incident management              │
│          │  lib/feature-flags/ │  ← Feature flag evaluation          │
│          │  lib/runbooks/      │  ← Runbook procedures               │
│          │  lib/audit/         │  ← Audit logging                    │
│          │  lib/http/          │  ← API response formatting          │
│          └──────────┬──────────┘                                     │
│                     │                                                │
│          ┌──────────▼──────────┐                                     │
│          │   DATA LAYER        │                                     │
│          │                     │                                     │
│          │  lib/db/schema.ts   │  ← Table definitions (Drizzle ORM) │
│          │  lib/db/index.ts    │  ← Connection pool                  │
│          │  lib/mock/          │  ← Hardcoded demo data              │
│          └──────────┬──────────┘                                     │
│                     │                                                │
└─────────────────────┼────────────────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌─────────────────┐     ┌──────────────────┐
│   PostgreSQL    │     │     Redis         │
│   (Port 5432)   │     │   (Port 6379)    │
│                 │     │                   │
│  20+ tables     │     │  Job queues       │
│  Operators      │     │  (BullMQ)         │
│  Customers      │     │                   │
│  Billing        │     └─────────┬─────────┘
│  Operations     │               │
│  Incidents      │               ▼
│  Feature Flags  │     ┌──────────────────┐
│  Audit Logs     │     │  WORKER PROCESS  │
│  ...            │     │  (worker/index)  │
└─────────────────┘     │                  │
                        │  Picks up queued │
                        │  operations and  │
                        │  processes them  │
                        │  in background   │
                        └──────────────────┘
```

---

## Request/Response Lifecycle

Let's trace what happens when an operator clicks "Customers" in the sidebar:

### Step 1: Browser Makes Request
The browser navigates to `http://localhost:3000/customers`. The `<Link>` component in the sidebar navigation (`opsforge-nav.tsx`) triggers client-side navigation.

### Step 2: Middleware Intercepts
Before any page code runs, `middleware.ts` intercepts the request:
1. Generates a unique `x-request-id` (UUID) for tracing
2. Checks if the route is "public" (`/login` or `/api/auth`)
3. Since `/customers` is NOT public, it checks `req.auth` — does this request have a valid session?
4. If NO session → redirect to `/login?next=/customers`
5. If YES session → pass the request through with `NextResponse.next()`

### Step 3: App Layout Verifies Session
The `(app)/layout.tsx` is a server component that runs on the server. It calls `auth()` to get the session. If somehow there's no session (belt-and-suspenders check), it redirects to `/login`. Otherwise, it renders:
- The sidebar (`OpsforgeNav` component)
- The header (`AppHeader` component showing the operator's name and role)
- The page content as `{children}`

### Step 4: Page Renders
The `customers/page.tsx` renders. Right now it's a placeholder, but in a full implementation it would:
1. Call the API: `GET /api/customers?limit=25`
2. Display the results in a table

### Step 5: API Route Handles Data Request
When the page fetches `GET /api/customers`:
1. The route handler in `api/customers/route.ts` runs
2. It validates query parameters using Zod (search, plan, status, region, cursor, limit)
3. If validation fails → returns `{ success: false, error: { code, message } }` with HTTP 400
4. If valid → filters mock customers, applies cursor-based pagination, returns `{ success: true, data: { items, pagination } }`

### Step 6: Response Returns
The JSON response flows back through Next.js to the browser. React renders the data.

---

## Key Design Decisions

### Why Next.js 14 with App Router?
- **Full-stack in one project**: Both the frontend (React pages) and backend (API routes) live together. For an internal tool, this is much simpler than maintaining separate frontend/backend repos.
- **Server Components**: Pages can fetch data directly on the server, reducing client-side JavaScript.
- **File-based routing**: The folder structure IS the URL structure. `app/(app)/customers/page.tsx` → `/customers`. This makes the app predictable.

### Why This Folder Structure?
```
src/
  app/          ← Routes (pages + API endpoints)
  components/   ← Reusable UI pieces
  lib/          ← Business logic, organized by domain
  types/        ← TypeScript type extensions
```
This follows **domain-driven organization** in `lib/`. Instead of grouping by technical layer (all services together, all models together), code is grouped by business domain (auth, operations, incidents, etc.). This means when you're working on "incidents," all the related code is in one folder.

### Why Drizzle ORM?
- **Type-safe**: The schema in TypeScript gives you autocomplete and catches errors at compile time
- **SQL-like**: Unlike some ORMs that hide SQL completely, Drizzle lets you think in SQL terms
- **Lightweight**: Much less overhead than heavy ORMs like Prisma for queries

### Why BullMQ + Redis?
Operations like "suspend 500 customers" shouldn't happen during the web request. They'd time out. Instead:
1. The web request creates a job in a Redis queue
2. Returns immediately with "queued" status
3. A separate worker process picks up the job and executes it
This is called **asynchronous job processing**.

### Why Mock Data Instead of Real DB Queries (For Now)?
The project is in Phase 1 — the architecture is established but most endpoints return mock/scaffolded data. This is a deliberate strategy: get the structure right first, then fill in the implementation. It's like building the frame of a house before adding walls.

### Why the Envelope Pattern?
Every API response follows the same shape:
```typescript
{ success: true, data: ... }   // or
{ success: false, error: { code: "...", message: "..." } }
```
This means the frontend ALWAYS knows how to handle responses. No guessing "is this an error? is this data?" The shape is predictable.

---

## Dependency Map

```
                        ┌──────────────┐
                        │  middleware   │ ──→ auth.ts ──→ lib/auth/config
                        └──────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             ┌────────────┐       ┌──────────────┐
             │ Page Routes │       │  API Routes  │
             └──────┬─────┘       └──────┬───────┘
                    │                    │
                    │              ┌─────┴─────┐
                    │              ▼           ▼
                    │     lib/http/envelope  lib/auth/middleware
                    │              │           │
                    │              └─────┬─────┘
                    │                    │
                    ▼                    ▼
             ┌────────────┐     ┌───────────────┐
             │ Components │     │ Business Logic │
             │            │     │                │
             │ app-header │     │ operations/    │
             │ opsforge-  │     │ approvals/     │
             │   nav      │     │ incidents/     │
             │ kpi-card   │     │ feature-flags/ │
             │ placeholder│     │ runbooks/      │
             └──────┬─────┘     │ audit/         │
                    │           └───────┬────────┘
                    │                   │
                    ▼                   ▼
              ┌───────────┐     ┌──────────────┐
              │ lib/utils  │     │  Data Layer  │
              │ (cn func)  │     │              │
              └───────────┘     │ db/schema    │
                                │ db/index     │
                                │ mock/*       │
                                └──────┬───────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │  PostgreSQL   │
                                │  Redis        │
                                └──────────────┘
```

**Key dependency rules:**
- **Pages** depend on **components** and **lib** — never the reverse
- **API routes** depend on **lib** modules — never on components
- **Business logic** (lib/) depends on **data layer** (db, mock) — never on routes or components
- **Schema** is a leaf node — it depends on nothing else in the project
- Everything flows downward: routes → logic → data

---

## Environment & Infrastructure

### Development Mode
```bash
docker compose up        # Starts PostgreSQL + Redis + App + Worker
# OR
npm run dev              # Just the Next.js app (needs PG + Redis running separately)
```

The `docker-compose.yml` orchestrates 4 services:
1. **app** — Next.js dev server on port 3000
2. **worker** — Background job processor
3. **postgres** — Database on port 5432
4. **redis** — Cache/queue on port 6379

### Production Mode
```bash
npm run build   # Compiles TypeScript, optimizes React, generates static assets
npm run start   # Runs the compiled production server
```

### Key Environment Variables
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `NEXTAUTH_SECRET` | Secret key for signing session tokens (JWT) |
| `NEXTAUTH_URL` | Base URL for auth callbacks |
| `SIMULATE_DATA` | Whether to generate fake data for demo |
| `LOG_LEVEL` | How verbose the server logs should be |

### Database Workflow
```bash
npm run db:generate   # Reads schema.ts → generates SQL migration files
npm run db:migrate    # Runs migration files against PostgreSQL
npm run seed          # Populates tables with demo data
npm run db:studio     # Opens a visual database browser
```

---

## Scaffolding Status (Honesty Check)

This project is intentionally in a **Phase 1 / scaffolded** state. Here's what's real vs. what's a placeholder:

| Layer | Status | Notes |
|-------|--------|-------|
| Auth (login, sessions, RBAC) | **Functional** | Works with hardcoded demo operators |
| Database schema | **Complete** | 20+ tables fully defined |
| Middleware (route protection) | **Functional** | Redirects unauthenticated users |
| App shell (sidebar, header) | **Functional** | Full navigation with 13 modules |
| Dashboard page | **Functional** | Renders mock KPIs and health data |
| Customer API (list, detail) | **Functional** | Reads from mock data, has real validation |
| All other API routes | **Scaffolded** | Return 501 Not Implemented |
| All other pages | **Scaffolded** | Show PlaceholderView component |
| Operations commands | **Scaffolded** | 16 commands defined (plus `base.ts` and `registry.ts`) but return placeholder results |
| Worker | **Scaffolded** | Processes jobs but does nothing meaningful |
| Feature flag evaluator | **Functional** | Real evaluation logic with hash-based bucketing |
| Incident severity classifier | **Functional** | Real classification logic |

This is a deliberate architectural pattern: **skeleton first, meat later**. The skeleton (routes, types, interfaces, folder structure) is the hardest part to change later, so it's built first and built correctly.
