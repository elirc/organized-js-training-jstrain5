# Chapter 2 — Tooling & Config: Why Conventions Are Machine-Enforced

> **Mental model:** every file at the repo root is a *contract with a machine*. `package.json`
> is the contract with npm, `tsconfig.json` with the TypeScript compiler, `.eslintrc.json`
> with the linter, `docker-compose.yml` with Docker, `drizzle.config.ts` with the migration
> tool. Professional teams don't ask developers to remember rules — they write the rules into
> these contracts so a machine enforces them on every save, commit, and build.

## Why this matters before any application code

At your first job, you'll notice something student projects don't have: you *can't* merge
code that fails the linter, the type checker, or the build. That's not bureaucracy. A team of
ten people cannot maintain consistency through goodwill — people forget, disagree, and leave.
So conventions get encoded into config files and checked by **CI** (continuous integration: a
server that runs `lint`, type-check, and `build` against every proposed change, and blocks
the merge if anything fails).

The symptom of a team *without* this: every file looks different, "works on my machine" bugs,
and code review threads arguing about semicolons instead of logic. The config files in this
chapter are how OpsForge avoids that — and, as you'll see in
[Chapter 9](09-ai-assisted-engineering.md), they're also what makes AI coding agents
dramatically more reliable here, because an agent gets the same instant feedback a human does.

## [`package.json`](../package.json) — the project manifest

Three jobs: identify the project, list its commands, list its libraries.

**The scripts are the project's verb list.** Whenever you join a codebase, read `"scripts"`
first — it tells you what the project can *do*:

```json
"scripts": {
  "dev": "next dev",                  // daily driver: dev server with hot reload
  "build": "next build",              // production compile; CI runs this to catch errors
  "start": "next start",              // serve the production build (needs `build` first)
  "lint": "next lint",                // ESLint; CI runs this too
  "seed": "tsx src/lib/db/seed.ts",   // fill the DB with demo data
  "worker": "tsx worker/index.ts",    // start the background job process
  "db:generate": "drizzle-kit generate", // schema.ts changed → write SQL migration files
  "db:migrate": "drizzle-kit migrate",   // apply migration files to Postgres
  "db:studio": "drizzle-kit studio"      // browser GUI for poking at the DB
}
```

The `db:` prefix is just a naming convention for grouping — npm doesn't treat the colon
specially. `tsx` runs TypeScript files directly without a compile step, which is why the
seed and worker scripts can point straight at `.ts` files.

**Dependencies vs. devDependencies:** `dependencies` are needed at runtime (`next`, `react`,
`drizzle-orm`, `pg`, `bullmq`, `zod`); `devDependencies` are tools you only need while
developing (`typescript`, `eslint`, `drizzle-kit`, `tsx`, `@types/*`). Getting this wrong
won't break your app, but it bloats production installs — and a reviewer will flag it.

**One detail worth noticing:** most versions use `^` ("any compatible minor/patch"), but
`next` is pinned to exactly `14.2.15`. Framework upgrades can break things, so the team
controls *when* that happens instead of letting `npm install` decide. Also note
`next-auth: 5.0.0-beta.25` — a **beta**. When auth behaves oddly after an update, check the
changelog before blaming your code.

## [`tsconfig.json`](../tsconfig.json) — the type-checking contract

Three lines carry almost all the weight:

```json
"strict": true,
"noEmit": true,
"paths": { "@/*": ["./src/*"] }
```

- **`strict: true`** turns on the whole family of strict checks (`strictNullChecks`,
  `noImplicitAny`, …). *The problem it solves:* JavaScript happily lets `undefined` flow
  through your program until it explodes somewhere far from the cause. Strict mode forces
  you to handle `null`/`undefined` where they can occur. *The junior symptom without it:* a
  production crash of `Cannot read properties of undefined` at 2 a.m., in code that "worked
  fine locally." When you hit a strict-mode error, the fix is to handle the type correctly —
  never to loosen the config. The compiler is finding a real bug early.
- **`noEmit: true`** looks bizarre — a compiler told not to compile? Here TypeScript is only
  the *type checker*; Next.js compiles the code itself (with SWC, a fast Rust compiler).
  Separation of duties: one tool verifies, another builds.
- **`paths`** creates the `@/` alias you'll see in every import:
  `import { db } from "@/lib/db"` instead of `import { db } from "../../../lib/db"`.
  Relative paths break when you move a file; the alias never does. Note this only tells
  *TypeScript* how to resolve — Next.js honors the same alias natively, but other tools
  (Jest, for instance) need it configured separately. That mismatch is a classic
  first-week-on-the-job confusion.

## [`.eslintrc.json`](../.eslintrc.json) — the two-line rulebook

```json
{ "extends": ["next/core-web-vitals", "next/typescript"] }
```

Tiny file, big idea: **you inherit rulesets, you don't write rules**. `next/core-web-vitals`
encodes hundreds of decisions by the Next.js team — including rules that catch real bugs,
like using `<img>` where `<Image>` is needed, or a missing dependency in a `useEffect`.
This is what "convention over configuration" looks like in practice. Run it with `npm run
lint`; CI runs the exact same command, which is why "it lints locally" and "it passes CI"
are the same statement.

## [`.env.example`](../.env.example) — configuration without secrets

```bash
DATABASE_URL=postgresql://opsforge:opsforge_dev@localhost:5432/opsforge
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=change-me
SIMULATE_DATA=true
```

*The problem it solves:* your app needs values that (a) differ between environments and
(b) must never be committed to git (a real `NEXTAUTH_SECRET` in git history is compromised
forever — git never forgets). But teammates still need to know *which* variables exist.

The convention: `.env.example` (names + safe defaults) is committed; `.env` (real values) is
listed in [`.gitignore`](../.gitignore) and never committed. First thing you do after cloning:
`cp .env.example .env`. The junior symptom of skipping this: the app crashes on startup with
`DATABASE_URL is required.` — a deliberate, loud failure thrown by
[`src/lib/db/index.ts`](../src/lib/db/index.ts) instead of a mysterious one later. Failing
fast on missing config is itself a convention worth copying.

## [`docker-compose.yml`](../docker-compose.yml) — the whole stack in one command

OpsForge needs four things running at once: the Next.js app, the background worker,
PostgreSQL, and Redis. Without Docker, that's "install Postgres 16, install Redis 7, start
them, in the right order, on every machine, identically." With it:

```yaml
services:
  app:      # Next.js dev server on :3000
  worker:   # separate process running worker/index.ts
  postgres: # postgres:16-alpine on :5432
  redis:    # redis:7-alpine on :6379
```

`docker compose up` starts everything; `depends_on` orders the startup. Notice `app` and
`worker` are two separate containers running the *same codebase* with different commands —
concrete proof of the "the worker is a separate process" point from
[Chapter 1](01-big-picture.md). The `pgdata` named volume is why your database survives
container restarts.

For day-to-day work most people run a hybrid: `docker compose up -d postgres redis` for the
infrastructure, `npm run dev` for the app (faster feedback than the containerized dev server).

## [`drizzle.config.ts`](../drizzle.config.ts) — the migration bridge

Your schema is TypeScript ([`src/lib/db/schema.ts`](../src/lib/db/schema.ts)); your database
speaks SQL. Drizzle Kit bridges them, and this file tells it where things are:

```typescript
export default {
  schema: "./src/lib/db/schema.ts",   // read table definitions from here
  out: "./src/lib/db/migrations",     // write generated SQL files here
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
} satisfies Config;
```

The workflow you'll repeat constantly once the DB layer is live:
**edit `schema.ts` → `npm run db:generate` (writes a SQL migration file) →
`npm run db:migrate` (applies it)**. Why migrations instead of just editing the database?
Because a database's structure must evolve *in lockstep with code, on every environment*.
Migrations are version-controlled, ordered, replayable changes — the git history of your
database. More in [Chapter 3](03-data-layer.md).

## [`tailwind.config.ts`](../tailwind.config.ts) — where the CSS comes from

The `content` array tells Tailwind which files to *scan for class names*; only classes it
finds actually end up in the CSS bundle. This has a sharp edge: build a class name
dynamically (`className={"text-" + color + "-500"}`) and Tailwind's scanner can't see it, so
the class silently doesn't exist. The `theme.extend.colors` block wires Tailwind color names
to CSS variables (`var(--background)`) — the bridge that makes dark mode work, covered in
[Chapter 6](06-ui-layer.md).

## Common junior mistakes

- **Weakening the config to silence an error.** Turning off `strict`, adding an
  `eslint-disable`, widening a type to `any`. This trades a visible compile-time error for
  an invisible runtime bug. The fix: treat tool errors as bug reports about your code.
- **Editing generated files.** `package-lock.json` and `next-env.d.ts` are machine-written.
  Hand-editing them causes drift that surfaces as unexplainable behavior on someone else's
  machine. Lock-file merge conflict? Delete it and `npm install` to regenerate.
- **Forgetting `npm install` after pulling.** A teammate added a dependency; you pull; the
  app dies with `Cannot find module`. Ritual: pull → install → run.
- **Committing `.env`.** Once a secret is in git history it is public forever, even if you
  delete it in the next commit. Rotate any secret that ever touches a commit.
- **Running `npm run start` without `npm run build`.** `start` serves a production build
  that must exist first. For development you want `npm run dev` anyway.

## Try it yourself

1. **Trip the type checker on purpose.** Create `src/scratch.ts` containing
   `function greet(name) { return "hi " + name; }`, then run `npx tsc --noEmit`. Read the
   error (`Parameter 'name' implicitly has an 'any' type`) and connect it to `strict: true`.
   Fix it with a type annotation, re-run, then delete the file. You have now experienced
   exactly what CI does to every pull request.
2. **Predict, then verify.** Without opening it, write down what you expect `npm run lint`
   to output on this repo (clean? warnings?). Run it. If anything appears, open one flagged
   file and understand the rule before moving on.
3. **Break an import alias.** Change `import { cn } from "@/lib/utils"` in
   [`src/components/opsforge-nav.tsx`](../src/components/opsforge-nav.tsx) to a relative
   path with the wrong number of `../`, and watch what the dev server and editor each tell
   you. Note *how fast* the feedback is — that speed is the whole point. Revert.
4. **Read the verb list of a stranger's repo.** Open the `package.json` of any open-source
   project you use and read only its `scripts`. How much of the project's workflow can you
   reconstruct from that alone?

## Ask your agent

> "In this repo, add a `db:reset` script to package.json that runs migrate and then seed.
> Follow the existing script naming conventions."

Review its diff: did it use the `db:` prefix? Did it reuse `drizzle-kit migrate` and
`tsx src/lib/db/seed.ts` (the existing commands), or invent new ones? An agent that has read
your config files follows your conventions; one that hasn't imports its habits from other
projects. Catching that difference in a diff is a skill you'll use every day.

---

**You can now:** set up the project from a fresh clone, explain what each root config file
enforces and why, and diagnose the five most common environment failures juniors hit.

**Next:** [Chapter 3 — The Data Layer](03-data-layer.md): the schema as the source of truth,
and how to read a 459-line table file without drowning.
