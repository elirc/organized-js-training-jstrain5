# OpsForge — Learning Path

Read the guides in this order. Each chapter builds on the previous one. Don't skip ahead — concepts compound.

---

## Chapter 1: Foundations — The Toolbox

Before reading any application code, understand the configuration files that make everything work together.

| Order | Guide | File |
|-------|-------|------|
| 1 | [Package.json Guide](guides/config/package-json.guide.md) | `package.json` |
| 2 | [TypeScript Config Guide](guides/config/tsconfig.guide.md) | `tsconfig.json` |
| 3 | [Tailwind Config Guide](guides/config/tailwind-config.guide.md) | `tailwind.config.ts` |
| 4 | [Docker Compose Guide](guides/config/docker-compose.guide.md) | `docker-compose.yml` |
| 5 | [Drizzle Config Guide](guides/config/drizzle-config.guide.md) | `drizzle.config.ts` |
| 6 | [Environment Variables Guide](guides/config/env-example.guide.md) | `.env.example` |

**Checkpoint:** After this chapter, you should understand:
- What every dependency in the project does and why it was chosen
- What TypeScript strict mode means and why `@/*` path aliases exist
- How Docker Compose orchestrates multiple services together
- The difference between dev dependencies and production dependencies
- What environment variables are and why secrets don't go in code

---

## Chapter 2: Styling — Making Things Look Right

| Order | Guide | File |
|-------|-------|------|
| 7 | [Global CSS Guide](guides/app/globals-css.guide.md) | `src/app/globals.css` |
| 8 | [Utils Guide](guides/app/utils.guide.md) | `src/lib/utils.ts` |

**Checkpoint:** After this chapter, you should understand:
- How CSS custom properties (variables) work and why they enable dark mode
- What Tailwind utility classes are and how `@layer` works
- Why the `cn()` utility function exists and when you'd use it
- How `clsx` and `tailwind-merge` solve the CSS class conflict problem

---

## Chapter 3: Data Layer — Where Information Lives

This is the foundation everything else builds on. The database schema defines WHAT data exists; the connection module defines HOW you access it.

| Order | Guide | File |
|-------|-------|------|
| 9 | [Database Connection Guide](guides/db/index.guide.md) | `src/lib/db/index.ts` |
| 10 | [Database Schema Guide](guides/db/schema.guide.md) | `src/lib/db/schema.ts` |
| 11 | [Seed Script Guide](guides/db/seed.guide.md) | `src/lib/db/seed.ts` |
| 12 | [Read Models Guide](guides/db/read-models.guide.md) | `src/lib/db/read-models/*.ts` |
| 13 | [Mock Customers Guide](guides/mock/customers.guide.md) | `src/lib/mock/customers.ts` |
| 14 | [Mock Dashboard Guide](guides/mock/dashboard.guide.md) | `src/lib/mock/dashboard.ts` |

**Checkpoint:** After this chapter, you should understand:
- What a connection pool is and why `max: 20` matters
- How Drizzle ORM maps TypeScript objects to SQL tables
- What database enums are and why they're better than plain strings
- How foreign keys create relationships between tables
- What indexes are and why they speed up queries
- The difference between mock data and real database queries
- What a "read model" is and why you'd want one

---

## Chapter 4: Authentication — Who Are You?

This is the security gate. Everything protected in the app depends on these files.

| Order | Guide | File |
|-------|-------|------|
| 15 | [Operators Guide](guides/auth/operators.guide.md) | `src/lib/auth/operators.ts` |
| 16 | [RBAC Guide](guides/auth/rbac.guide.md) | `src/lib/auth/rbac.ts` |
| 17 | [Auth Config Guide](guides/auth/config.guide.md) | `src/lib/auth/config.ts` |
| 18 | [Auth Init Guide](guides/root/auth.guide.md) | `auth.ts` |
| 19 | [Auth Middleware Helper Guide](guides/auth/middleware.guide.md) | `src/lib/auth/middleware.ts` |
| 20 | [NextAuth Type Extensions Guide](guides/types/next-auth-d.guide.md) | `src/types/next-auth.d.ts` |
| 21 | [Root Middleware Guide](guides/root/middleware.guide.md) | `middleware.ts` |

**Checkpoint:** After this chapter, you should understand:
- What JWT (JSON Web Tokens) are and how they store session data
- How the Credentials provider validates email + password
- What RBAC is and how roles map to permissions
- How middleware intercepts every request before it reaches a page
- What TypeScript module augmentation is and why NextAuth needs it
- The difference between authentication (who are you?) and authorization (what can you do?)

---

## Chapter 5: API Layer — The Envelope Pattern & Routes

How the server talks to the client. This is the contract between frontend and backend.

| Order | Guide | File |
|-------|-------|------|
| 22 | [HTTP Envelope Guide](guides/http/envelope.guide.md) | `src/lib/http/envelope.ts` |
| 23 | [Auth Route Guide](guides/api/auth-route.guide.md) | `src/app/api/auth/[...nextauth]/route.ts` |
| 24 | [Dashboard Routes Guide](guides/api/dashboard-routes.guide.md) | `src/app/api/dashboard/kpis/route.ts` & `health/route.ts` |
| 25 | [Customers List Route Guide](guides/api/customers-route.guide.md) | `src/app/api/customers/route.ts` |
| 26 | [Customer Detail Route Guide](guides/api/customer-detail-route.guide.md) | `src/app/api/customers/[id]/route.ts` |
| 27 | [Scaffolded Routes Guide](guides/api/scaffolded-routes.guide.md) | Various `route.ts` files |
| 28 | [SSE Events Stream Guide](guides/api/events-stream.guide.md) | `src/app/api/events/stream/route.ts` |

**Checkpoint:** After this chapter, you should understand:
- What discriminated unions are and why the envelope pattern uses one
- How Next.js API routes map HTTP methods to exported functions
- What Zod schema validation does and why you validate at the boundary
- How cursor-based pagination works (vs. offset-based)
- What catch-all routes (`[...nextauth]`) and dynamic routes (`[id]`) are
- What Server-Sent Events (SSE) are and how ReadableStream works
- Why scaffolded routes return 501 and what that status code means

---

## Chapter 6: UI Components — Building Blocks

Reusable pieces that pages are assembled from.

| Order | Guide | File |
|-------|-------|------|
| 29 | [KPI Card Guide](guides/components/kpi-card.guide.md) | `src/components/kpi-card.tsx` |
| 30 | [Placeholder View Guide](guides/components/placeholder-view.guide.md) | `src/components/placeholder-view.tsx` |
| 31 | [App Header Guide](guides/components/app-header.guide.md) | `src/components/app-header.tsx` |
| 32 | [Navigation Guide](guides/components/opsforge-nav.guide.md) | `src/components/opsforge-nav.tsx` |

**Checkpoint:** After this chapter, you should understand:
- How React components accept props and what TypeScript types enforce about them
- The difference between a server component and a client component (`"use client"`)
- How `usePathname()` detects the current route for active link highlighting
- What conditional rendering is and why `{condition ? <A /> : null}` works
- How icons work as React components (Lucide)

---

## Chapter 7: Pages & Layouts — Assembling the UI

How everything comes together into actual screens the user sees.

| Order | Guide | File |
|-------|-------|------|
| 33 | [Root Layout Guide](guides/app/root-layout.guide.md) | `src/app/layout.tsx` |
| 34 | [Root Page Guide](guides/app/root-page.guide.md) | `src/app/page.tsx` |
| 35 | [Login Page Guide](guides/app/login-page.guide.md) | `src/app/(auth)/login/page.tsx` |
| 36 | [App Layout Guide](guides/app/app-layout.guide.md) | `src/app/(app)/layout.tsx` |
| 37 | [Dashboard Page Guide](guides/app/dashboard-page.guide.md) | `src/app/(app)/dashboard/page.tsx` |
| 38 | [Placeholder Pages Guide](guides/app/placeholder-pages.guide.md) | Various `page.tsx` files |

**Checkpoint:** After this chapter, you should understand:
- How Next.js nested layouts work (root layout wraps app layout wraps page)
- What route groups `(auth)` and `(app)` are and why they don't appear in URLs
- How server-side redirects work with `redirect()`
- How form submission works in React with `useState` and `onSubmit`
- What `FormData` is and how to extract values from it
- How the app shell pattern (sidebar + header + content) is constructed

---

## Chapter 8: Business Logic — Operations System

The heart of the application. This is where domain knowledge lives.

| Order | Guide | File |
|-------|-------|------|
| 39 | [Operation Command Base Guide](guides/operations/commands-base.guide.md) | `src/lib/operations/commands/base.ts` |
| 40 | [Command Registry Guide](guides/operations/commands-registry.guide.md) | `src/lib/operations/commands/registry.ts` |
| 41 | [Example Commands Guide](guides/operations/commands-example.guide.md) | `src/lib/operations/commands/*.ts` |
| 42 | [Operation Engine Guide](guides/operations/engine.guide.md) | `src/lib/operations/engine.ts` |
| 43 | [Dry Run Guide](guides/operations/dry-run.guide.md) | `src/lib/operations/dry-run.ts` |
| 44 | [Rollback Guide](guides/operations/rollback.guide.md) | `src/lib/operations/rollback.ts` |
| 45 | [Validators Guide](guides/operations/validators.guide.md) | `src/lib/operations/validators.ts` |
| 46 | [Rate Limiter Guide](guides/operations/rate-limiter.guide.md) | `src/lib/operations/rate-limiter.ts` |

**Checkpoint:** After this chapter, you should understand:
- What the Command Pattern is and why operations use it
- How a registry pattern decouples commands from the engine
- What dry-run/simulation means and why it matters for dangerous operations
- What idempotency means and why operations need idempotency keys
- What rate limiting is and why you'd limit operators (not just external users)
- How rollback works conceptually

---

## Chapter 9: Supporting Domain Logic

Smaller but important business modules.

| Order | Guide | File |
|-------|-------|------|
| 47 | [Approval Policies Guide](guides/approvals/policies.guide.md) | `src/lib/approvals/policies.ts` |
| 48 | [Approval Service Guide](guides/approvals/service.guide.md) | `src/lib/approvals/service.ts` |
| 49 | [Approval Notifications Guide](guides/approvals/notifications.guide.md) | `src/lib/approvals/notifications.ts` |
| 50 | [Severity Classifier Guide](guides/incidents/severity.guide.md) | `src/lib/incidents/severity.ts` |
| 51 | [Impact Calculator Guide](guides/incidents/impact.guide.md) | `src/lib/incidents/impact.ts` |
| 52 | [Incident Service Guide](guides/incidents/service.guide.md) | `src/lib/incidents/service.ts` |
| 53 | [Feature Flag Rollout Guide](guides/feature-flags/rollout.guide.md) | `src/lib/feature-flags/rollout.ts` |
| 54 | [Feature Flag Evaluator Guide](guides/feature-flags/evaluator.guide.md) | `src/lib/feature-flags/evaluator.ts` |
| 55 | [Feature Flag Service Guide](guides/feature-flags/service.guide.md) | `src/lib/feature-flags/service.ts` |
| 56 | [Runbook Templates Guide](guides/runbooks/templates.guide.md) | `src/lib/runbooks/templates.ts` |
| 57 | [Runbook Service Guide](guides/runbooks/service.guide.md) | `src/lib/runbooks/service.ts` |
| 58 | [Runbook Executor Guide](guides/runbooks/executor.guide.md) | `src/lib/runbooks/executor.ts` |
| 59 | [Audit Log Guide](guides/audit/log.guide.md) | `src/lib/audit/log.ts` |

**Checkpoint:** After this chapter, you should understand:
- What an approval workflow is and when operations should require one
- How severity classification works (thresholds → categories)
- What a hash function is and how it enables percentage-based feature rollouts
- The difference between boolean flags, percentage rollouts, and targeted flags
- What rule-based evaluation is and how `Array.some()` implements OR logic
- What audit logging is and why it's non-negotiable for admin tools
- What `as const` assertions do in TypeScript

---

## Chapter 10: Infrastructure — Background Processing & Simulation

| Order | Guide | File |
|-------|-------|------|
| 60 | [Worker Guide](guides/worker/index.guide.md) | `worker/index.ts` |
| 61 | [Simulators Guide](guides/simulators/overview.guide.md) | `src/lib/simulators/*.ts` |

**Checkpoint:** After this chapter, you should understand:
- What a message queue is and why BullMQ uses Redis
- The producer-consumer pattern (web app produces jobs, worker consumes them)
- Why background processing is essential for long-running operations
- What simulation/data generation is and why it helps during development

---

## Final Project: Put It All Together

After completing all chapters, try these exercises:

1. **Trace a full operation**: Starting from the browser, trace what happens when an operator clicks "Suspend Customer." Write down every file that gets touched and in what order.

2. **Add a new command**: Create a new operation command `customer.merge` that would (hypothetically) merge two customer accounts. Follow the existing command pattern.

3. **Add a new API route**: Create `GET /api/customers/[id]/incidents` that returns mock incident data for a specific customer.

4. **Modify the RBAC**: Add a new role `"auditor"` that can only read dashboards and audit logs. Update all relevant files.

5. **Build a real page**: Replace one of the placeholder pages (e.g., `/billing`) with a real page that fetches data from its API route and displays it in a table.
