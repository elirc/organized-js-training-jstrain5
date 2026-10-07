# Chapter 3 — The Data Layer: Where Information Lives

> **Mental model:** the data layer has two parallel worlds right now. The *schema*
> ([`src/lib/db/schema.ts`](../src/lib/db/schema.ts)) is the complete, real blueprint of what
> data will exist in PostgreSQL. The *mock data* ([`src/lib/mock/`](../src/lib/mock)) is a
> hardcoded stand-in that feeds the UI today. The rest of the app is written so that swapping
> mock for real is a change *inside* the data layer — the layers above never notice.

## Why the schema is the most important file in the project

When someone asks "what fields does a customer have?" or "can an operation exist without a
requester?", the answer is not in a wiki, not in a Slack thread, and not in anyone's memory.
It is in `schema.ts`, and it is *enforced by the database*. That is the difference between
documentation and a schema: documentation describes intent; a schema makes violations
impossible.

The problem this solves: in a team, data shape drifts. One developer stores status as
`"Active"`, another as `"active"`, a third as `1`. Six months later a dashboard silently
under-counts customers. A schema with enums and constraints makes that entire bug category
unrepresentable.

## How to read a Drizzle schema (a skill, not a tour)

`schema.ts` is 458 lines defining 20+ tables. Do not read it top to bottom. Instead, learn
to decode *one table completely* — the rest reuse the same vocabulary. Here is
`customers`, annotated:

```typescript
// src/lib/db/schema.ts
export const customers = pgTable(
  "customers",                                    // ← table name in actual SQL
  {
    id: uuid("id").primaryKey().defaultRandom(),  // ← Postgres generates the UUID
    accountId: uuid("account_id")                 // ← camelCase in TS, snake_case in SQL
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),  // ← foreign key
    companyName: varchar("company_name", { length: 180 }).notNull(),
    plan: planEnum("plan").notNull(),             // ← only "free"|"starter"|"business"|"enterprise"
    status: customerStatusEnum("status").notNull().default("active"),
    mrr: numeric("mrr", { precision: 12, scale: 2 }).notNull().default("0"),
    churnRiskScore: numeric("churn_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({                                   // ← second argument: indexes
    accountIdx: index("customers_account_idx").on(table.accountId),
    statusIdx: index("customers_status_idx").on(table.status),
    regionIdx: index("customers_region_idx").on(table.region),
  }),
);
```

Line by line, the ideas that transfer to every other table:

- **`.references(() => accounts.id, { onDelete: "cascade" })`** — a *foreign key*: every
  customer must point at a real account, and if that account is deleted, its customers go
  with it. Without this, you get *orphaned rows* — customers pointing at nothing, crashing
  every page that joins the two tables. `cascade` is a choice, not a default: the
  `operations` table uses `onDelete: "set null"` for `approvedBy`, because deleting an
  operator's account shouldn't erase the record that an operation *was* approved.
- **`planEnum("plan")`** — enums (defined at the top of the file:
  `pgEnum("plan", ["free", "starter", "business", "enterprise"])`) make invalid values a
  database error instead of a data-quality mystery. Notice these exact four values appear
  again in the Zod schema of the customers API route and in the mock types — one source of
  truth, echoed at each layer.
- **`numeric` for money, never `float`** — `precision: 12, scale: 2` means "12 digits, 2
  after the decimal." Floats do binary rounding (`0.1 + 0.2 === 0.30000000000000004`), which
  in a billing table is a lawsuit. This is one of those invisible professional conventions:
  nobody will tell you, but everyone expects it.
- **Indexes on `status`, `region`, `accountId`** — an index is a lookup structure that makes
  `WHERE status = 'active'` fast. The pattern to internalize: *index the columns you filter
  by*. The API route filters customers by plan, status, and region — and each has an index.
  Schema design and API design were done by the same brain, and it shows.
- **`createdAt`/`updatedAt` with `withTimezone: true`** — every table has them. Timestamps
  without time zones are a classic source of "the report is off by 5 hours" bugs.

Now the payoff table — `operations` — because its columns encode the business rules you'll
meet in [Chapter 7](07-operations-engine.md):

```typescript
// src/lib/db/schema.ts
export const operations = pgTable("operations", {
  // ...
  status: operationStatusEnum("status").notNull().default("draft"),
  dangerLevel: dangerLevelEnum("danger_level").notNull().default("safe"),
  dryRun: boolean("dry_run").notNull().default(true),       // ← simulate by DEFAULT
  requestedBy: uuid("requested_by").notNull().references(() => operators.id),
  approvedBy: uuid("approved_by").references(() => operators.id, { onDelete: "set null" }),
  idempotencyKey: varchar("idempotency_key", { length: 120 }).notNull(),
  // ...
}, (table) => ({
  idempotencyKeyIdx: uniqueIndex("operations_idempotency_key_uidx").on(table.idempotencyKey),
}));
```

Read the defaults as policy: a new operation is a `draft`, presumed `safe`, and runs as a
`dryRun` **unless someone explicitly says otherwise**. Safe-by-default, encoded in the
schema. And the `uniqueIndex` on `idempotencyKey` is the database *enforcing* that the same
operation cannot be executed twice — if two requests race to insert the same key, the second
insert fails at the database level, no matter how buggy the application code is. Application
checks can race; unique constraints cannot.

## The connection: [`src/lib/db/index.ts`](../src/lib/db/index.ts)

Eighteen lines, three professional patterns:

```typescript
import "server-only";                       // ① build error if a client component imports this

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");  // ② fail fast, loudly, at startup
}

const pool = new Pool({ connectionString, max: 20 });  // ③ reuse connections

export const db = drizzle(pool, { schema });
```

① `"server-only"` is a tripwire: if any `"use client"` component ever imports this file
(even indirectly), the *build fails*. Why so drastic? Because the alternative is your
database credentials getting bundled into the JavaScript sent to every visitor's browser.
② Checking config at startup converts "mysterious failure on the first query, whenever that
happens" into "clear failure the second the server boots."
③ Opening a Postgres connection takes real time (TCP + auth handshake). A *pool* keeps up
to 20 connections open and lends them out per query. Without pooling, an app under load
exhausts the database's connection limit and everything stops — the classic "works in dev,
dies in prod" failure, because dev has one user and prod has a thousand.

## Migrations: how the schema reaches the database

The schema file doesn't touch the database directly. The workflow (wired up in
[Chapter 2](02-tooling.md)) is:

```
edit schema.ts  →  npm run db:generate  →  npm run db:migrate
                   (writes SQL files to      (applies pending SQL
                    src/lib/db/migrations)    files to Postgres)
```

Migrations are version-controlled SQL files — the git history of your database's *shape*.
Why not just edit the database by hand? Because there are many databases (yours, each
teammate's, staging, production) and they must all evolve identically, in order. Hand-edited
databases drift; drifted databases produce bugs that only reproduce on one machine.

[`src/lib/db/seed.ts`](../src/lib/db/seed.ts) is the companion: a script that fills a fresh
database with demo data (`npm run seed`). Today it's a stub — but note `faker.seed(42)` in
it: seeding the random generator means *everyone gets the same fake data*. Deterministic
test data is what makes "look at customer cus_003" a sentence a teammate can act on.

## Mock data: the stand-in with a real job

[`src/lib/mock/customers.ts`](../src/lib/mock/customers.ts) and
[`src/lib/mock/dashboard.ts`](../src/lib/mock/dashboard.ts) feed the UI today. Two things
make them better than typical throwaway mocks:

```typescript
// src/lib/mock/customers.ts
export type CustomerStatus = "active" | "suspended" | "churned";
export type CustomerPlan = "free" | "starter" | "business" | "enterprise";

export const mockCustomers: MockCustomer[] = [
  { id: "cus_001", companyName: "Acme Telecom Labs", plan: "enterprise",
    status: "active", region: "us-east", mrr: 4200, churnRiskScore: 0.11, healthScore: 0.92 },
  { id: "cus_003", companyName: "Helio Health Systems", plan: "starter",
    status: "suspended", region: "eu-west", mrr: 79, churnRiskScore: 0.81, healthScore: 0.39 },
  // ...
];
```

First: the union types **mirror the database enums exactly**. The mock is shaped like the
future, so when real queries replace it, the UI doesn't change. Second: the data is chosen
to *exercise edge cases* — there's a suspended customer, a $0-MRR free customer, a
high-churn-risk row. Good mock data is a test suite you can see.

Mock data is also an implicit **spec**. Open
[`src/lib/mock/dashboard.ts`](../src/lib/mock/dashboard.ts) and you can read exactly what
the product cares about: MRR, error rate against SLO, pending approvals with expiry
pressure. New to a project? Read its mocks.

One more stub worth naming: [`src/lib/db/read-models/`](../src/lib/db/read-models) holds
three placeholder **read models** — pre-computed summaries (e.g. "customers per region")
that get refreshed periodically instead of recalculated per request. The idea: when a
dashboard query is expensive, compute it once a minute, not once per viewer. File it away;
it becomes real in a later phase.

## Common junior mistakes

- **Editing the database directly instead of writing a migration.** Works on your machine,
  breaks on everyone else's, and production never gets the change. Symptom: "column does not
  exist" errors that only some environments produce. Fix: schema change → generate → migrate,
  every time, no exceptions.
- **Storing money as floats.** Covered above; repeated because payroll depends on it.
- **Skipping the foreign key "because it's faster."** It is faster — right up until orphaned
  rows crash your joins. Referential integrity is one of the few things you cannot reliably
  bolt on later, because by then the orphans already exist.
- **Letting mock shapes drift from schema shapes.** If the mock grows a field the schema
  doesn't have, the UI builds against fiction and the real-data swap becomes a rewrite. Fix:
  when you touch the schema, grep the mocks.
- **Trusting TypeScript to validate runtime data.** Types are erased at runtime. The
  database enum and the Zod schema (next chapter's territory) are the *runtime* guarantees;
  TypeScript only checks what the compiler can see.

## Try it yourself

1. **Predict, then read.** Before opening it, write down what columns you'd expect the
   `audit_log` table to have (think: who, did what, to which thing, when, from where). Then
   read the `auditLog` table at the bottom of
   [`src/lib/db/schema.ts`](../src/lib/db/schema.ts). What did the designers include that
   you didn't think of? (Look for `oldValue`/`newValue` — audit logs record the *diff*.)
2. **Decode a table you've never seen.** Pick `invoices` or `featureFlags` in the schema and
   write, in plain English, every rule the database enforces on it (required fields, allowed
   values, relationships, uniqueness). This is the reading skill this chapter exists to build.
3. **Break the mock/API contract.** In
   [`src/lib/mock/customers.ts`](../src/lib/mock/customers.ts), change `cus_001`'s plan to
   `"platinum"`. Watch TypeScript object immediately (the `CustomerPlan` union). Now imagine
   this file were plain JavaScript — where would this error have surfaced instead? (Answer:
   in the API's Zod filter or in the UI, far from the cause.) Revert.
4. **Find the safety default.** Search `schema.ts` for `default(` and list every default
   that encodes a *safety decision* rather than a convenience (start with `dryRun` and
   `dangerLevel`). Schemas have opinions; learn to spot them.

## Ask your agent

> "Read src/lib/db/schema.ts and explain the lifecycle of an operation row: which columns
> change as it moves from draft to completed, who sets approvedBy, and what the unique
> index on idempotencyKey protects against. Cite line numbers."

You already know the answer from this chapter — that's the point. Grade the agent's answer.
Using an agent to *explore* code you're about to work on (rather than to write code
immediately) is pattern #1 in [Chapter 9](09-ai-assisted-engineering.md).

---

**You can now:** read any table in the schema and state the rules it enforces, explain
pooling, `server-only`, and migrations to another junior, and evaluate whether mock data is
doing its job.

**Next:** [Chapter 4 — Authentication & Permissions](04-authentication.md): the login flow
traced through all seven files that make it work.
