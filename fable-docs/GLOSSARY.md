# Glossary

Every term a junior might not know, in plain English, with a pointer to the chapter that
develops it and (where useful) the file in this repo where you can see it. The original
[`_learning/02-GLOSSARY.md`](../_learning/02-GLOSSARY.md) has longer code samples per term;
this version is optimized for quick lookup while reading the chapters.

**API (Application Programming Interface)** — a set of URLs a program calls to get or send
data as JSON. Lives in `src/app/api/`. → [Ch. 5](05-api-layer.md)

**API route (Next.js)** — a `route.ts` file whose exported function names (`GET`, `POST`, …)
handle those HTTP methods for the URL its folder path spells. → [Ch. 5](05-api-layer.md)

**App Router** — Next.js routing where the folder tree *is* the URL structure.
→ [Ch. 1](01-big-picture.md), [Ch. 6](06-ui-layer.md)

**`as const`** — TypeScript assertion that keeps a value's most specific, readonly type
(`"queued"` instead of `string`). Seen in [`engine.ts`](../src/lib/operations/engine.ts).
→ [Ch. 7](07-operations-engine.md)

**Audit log** — the record of who did what, to which resource, when, from where — including
the before/after diff. See [`src/lib/audit/log.ts`](../src/lib/audit/log.ts).
→ [Ch. 8](08-domain-services.md)

**Authentication vs. authorization** — identity ("who are you?") vs. permission ("may you
do this?"). Mapped to HTTP 401 vs. 403. → [Ch. 4](04-authentication.md)

**Blocker vs. warning** — in a dry-run report: a hard stop vs. a proceed-with-caution note.
→ [Ch. 7](07-operations-engine.md)

**BullMQ** — the Redis-backed job-queue library the worker uses. → [Ch. 7](07-operations-engine.md)

**CI (continuous integration)** — a server that runs lint/type-check/build against every
proposed change and blocks merging on failure; how conventions get machine-enforced.
→ [Ch. 2](02-tooling.md)

**Classifier** — a function mapping a continuous value to a discrete category, like error
rate → sev1–sev4 in [`severity.ts`](../src/lib/incidents/severity.ts). → [Ch. 8](08-domain-services.md)

**Client component** — a React component marked `"use client"` that runs in the browser;
required for state, events, and hooks like `usePathname`. → [Ch. 6](06-ui-layer.md)

**Code review / PR (pull request)** — the proposal-and-review workflow by which changes
enter a shared codebase; reviewers check layering, contracts, and conventions — the same
checklist you'd apply to an agent's diff. → [Ch. 2](02-tooling.md), [Ch. 9](09-ai-assisted-engineering.md)

**Command pattern** — every dangerous action as its own object with a uniform interface
(`key`, `dryRun`, `execute`), instead of a giant switch. → [Ch. 7](07-operations-engine.md)

**Connection pool** — pre-opened, reused database connections (`max: 20` in
[`db/index.ts`](../src/lib/db/index.ts)); opening fresh connections per request collapses
under load. → [Ch. 3](03-data-layer.md)

**Cursor pagination** — paging with a "give me what comes after ID X" bookmark instead of
page numbers; immune to rows shifting between requests. → [Ch. 5](05-api-layer.md)

**Discriminated union** — a union type with a shared tag field that lets TypeScript narrow
which variant you hold; the envelope's `success` field is the textbook case.
→ [Ch. 5](05-api-layer.md)

**Drizzle ORM** — defines database tables in TypeScript
([`schema.ts`](../src/lib/db/schema.ts)) and generates SQL migrations from them.
→ [Ch. 3](03-data-layer.md)

**Dry run** — simulating an operation to report what *would* happen, mutating nothing.
→ [Ch. 7](07-operations-engine.md)

**Enum (database)** — a column restricted to a fixed value set (`plan` can only be
free/starter/business/enterprise); makes invalid data impossible rather than unlikely.
→ [Ch. 3](03-data-layer.md)

**Envelope** — this repo's universal response shape: `{ success: true, data }` or
`{ success: false, error: { code, message } }`. → [Ch. 5](05-api-layer.md)

**Environment variable** — configuration set outside code (`.env`); names are shared via
`.env.example`, values never committed. → [Ch. 2](02-tooling.md)

**Feature flag** — a switch to turn features on/off without deploying; boolean, percentage,
or targeted. → [Ch. 8](08-domain-services.md)

**Foreign key** — a column referencing another table's primary key; the database's guarantee
against orphaned rows. → [Ch. 3](03-data-layer.md)

**Guard clause / early return** — handle the failure case first and return, keeping the
happy path unindented. → [Ch. 4](04-authentication.md)

**Hash function** — same input, same fixed-size output, forever; powers deterministic
percentage rollouts in [`rollout.ts`](../src/lib/feature-flags/rollout.ts).
→ [Ch. 8](08-domain-services.md)

**Idempotency / idempotency key** — running an operation twice has the effect of once; the
unique key (enforced by a DB unique index) is what makes queue redeliveries harmless.
→ [Ch. 3](03-data-layer.md), [Ch. 7](07-operations-engine.md)

**Index (database)** — a lookup structure making filtered queries fast; index the columns
you filter by. → [Ch. 3](03-data-layer.md)

**JWT (JSON Web Token)** — a signed string carrying session data in a cookie; tampering
breaks the signature. → [Ch. 4](04-authentication.md)

**Layout (Next.js)** — a component wrapping all pages in its route segment, persisting
across navigation (the sidebar never re-renders). → [Ch. 6](06-ui-layer.md)

**Middleware** — code that intercepts every request before any route runs; the app's
front-door guard ([`middleware.ts`](../middleware.ts)). → [Ch. 1](01-big-picture.md)

**Migration** — a version-controlled SQL change to the database's structure; the git
history of your schema. → [Ch. 3](03-data-layer.md)

**Mock data** — hardcoded stand-in data shaped like the future database rows
([`src/lib/mock/`](../src/lib/mock)); doubles as an implicit product spec.
→ [Ch. 3](03-data-layer.md)

**Module augmentation** — extending a library's TypeScript types
([`next-auth.d.ts`](../src/types/next-auth.d.ts) adds `role` to `Session`).
→ [Ch. 4](04-authentication.md)

**Path alias** — `@/*` → `./src/*`, so imports don't count `../` levels.
→ [Ch. 2](02-tooling.md)

**Producer–consumer** — one process enqueues jobs, a separate worker process dequeues and
runs them; how slow work escapes the request/response cycle.
→ [Ch. 7](07-operations-engine.md)

**RBAC (role-based access control)** — users get roles; roles get permission lists; checks
ask `hasPermission(role, permission)` in exactly one place
([`rbac.ts`](../src/lib/auth/rbac.ts)). → [Ch. 4](04-authentication.md)

**Rate limiting** — capping how many actions per time window; here per-operator,
per-command. → [Ch. 7](07-operations-engine.md)

**Read model** — a pre-computed, periodically refreshed summary serving expensive dashboard
queries cheaply. → [Ch. 3](03-data-layer.md)

**Registry pattern** — modules register themselves in a central map and are looked up by
key ([`registry.ts`](../src/lib/operations/commands/registry.ts)); decouples the engine
from the commands. → [Ch. 7](07-operations-engine.md)

**Route group** — a `(parenthesized)` folder that organizes routes and attaches layouts
without appearing in the URL: `(auth)`, `(app)`. → [Ch. 6](06-ui-layer.md)

**`satisfies`** — TypeScript keyword validating a value against a type without widening it;
see `authConfig` in [`config.ts`](../src/lib/auth/config.ts). → [Ch. 4](04-authentication.md)

**Scaffolding / stub** — deliberate placeholder code that fixes structure (routes, types,
signatures) before behavior; read stubs for their promises. → [Ch. 1](01-big-picture.md)

**Schema** — the enforced blueprint of what data exists and what rules bind it
([`schema.ts`](../src/lib/db/schema.ts)). → [Ch. 3](03-data-layer.md)

**Server component** — the Next.js default: renders on the server, can touch the database,
ships no component JS to the browser. → [Ch. 6](06-ui-layer.md)

**`"server-only"`** — an import that fails the build if server code is pulled into a client
component; a credentials-in-the-bundle tripwire. → [Ch. 3](03-data-layer.md)

**SSE (Server-Sent Events)** — a one-way stream where the server pushes updates to the
browser ([`events/stream/route.ts`](../src/app/api/events/stream/route.ts)).
→ [Ch. 5](05-api-layer.md)

**Type assertion (`as`)** — telling TypeScript to trust you about a type; silences rather
than convinces the compiler — use sparingly. → [Ch. 4](04-authentication.md)

**Union type** — a type that is one of several alternatives:
`"active" | "suspended" | "churned"`. → [Ch. 3](03-data-layer.md)

**UUID** — a 128-bit practically-unique identifier used as primary keys throughout the
schema. → [Ch. 3](03-data-layer.md)

**Zod** — runtime schema validation: TypeScript checks compile-time shape, Zod checks the
actual data arriving at your boundaries. → [Ch. 5](05-api-layer.md)

**501 Not Implemented** — the honest status for scaffolded endpoints: "you asked correctly;
it isn't built yet" (vs. 404 "wrong URL"). → [Ch. 1](01-big-picture.md)
