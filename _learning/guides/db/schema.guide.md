# Guide: Database Schema (The Most Important File in the Project)

**Source file:** `src/lib/db/schema.ts` (459 lines)

---

## Purpose

This file defines every single table in the database. It is the **source of truth** for the data model of the entire application. When someone asks "what fields does a customer have?" or "how are invoices related to customers?", the answer is in this file.

The file uses **Drizzle ORM** to define tables in TypeScript instead of writing raw SQL `CREATE TABLE` statements. This gives you two major benefits:

1. **Type safety.** Every query you write in TypeScript knows the shape of every table -- the column names, their types, which are nullable, which have defaults. Typos and type mismatches are caught at compile time, not at runtime.
2. **Single source of truth.** The schema file generates both the TypeScript types and the SQL migrations. You do not have to keep a `.sql` file and a TypeScript interface in sync manually.

This is the longest guide because this is the most important file. Take your time with it.

---

## Section 1: Imports (Lines 1-15)

```typescript
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
```

Every import here is a building block for defining tables. Let's go through each one:

### Column Type Functions

These functions define what kind of data a column holds. They map directly to PostgreSQL column types.

| Function | PostgreSQL type | What it stores | Example |
|---|---|---|---|
| `uuid` | `UUID` | 128-bit unique identifiers like `"a1b2c3d4-e5f6-..."` | Primary keys |
| `varchar` | `VARCHAR(n)` | Text with a maximum length | Names, emails |
| `text` | `TEXT` | Text with no length limit | Descriptions, reasons, messages |
| `boolean` | `BOOLEAN` | `true` or `false` | `isActive`, `dryRun` |
| `integer` | `INTEGER` | Whole numbers (-2 billion to +2 billion) | Counts, percentages |
| `numeric` | `NUMERIC(p, s)` | Exact decimal numbers | Money, scores |
| `timestamp` | `TIMESTAMP` / `TIMESTAMPTZ` | Date and time | `createdAt`, `resolvedAt` |
| `jsonb` | `JSONB` | Arbitrary JSON data, stored in binary format | Metadata, configuration, rules |

**Why `numeric` instead of `integer` for money?** Floating-point numbers (`float`, `double`) cannot represent money accurately. `0.1 + 0.2 === 0.30000000000000004` in JavaScript. The `numeric` type stores exact decimal values. `numeric(12, 2)` means up to 12 total digits, 2 after the decimal point -- so up to `9999999999.99`. Perfect for dollar amounts.

**Why `jsonb` instead of `json`?** PostgreSQL has two JSON types. `json` stores the raw text. `jsonb` parses it into an efficient binary format. `jsonb` is faster to query (you can index into it) and is almost always the right choice. The only reason to use `json` is if you need to preserve the exact formatting of the original JSON string, which you almost never do.

### Table and Constraint Functions

| Function | What it does |
|---|---|
| `pgTable` | Defines a new database table |
| `pgEnum` | Defines a PostgreSQL enum type (a column that can only hold specific string values) |
| `index` | Creates a database index for faster lookups (allows duplicates) |
| `uniqueIndex` | Creates a database index that also enforces uniqueness |
| `primaryKey` | Defines a composite primary key (a primary key made of multiple columns) |

---

## Section 2: Enum Definitions (Lines 17-55)

```typescript
export const roleEnum = pgEnum("role", [
  "super_admin",
  "ops_lead",
  "ops_engineer",
  "support",
  "finance",
  "viewer",
]);
```

A **PostgreSQL enum** is a custom type that restricts a column to a specific set of values. This is like a union type in TypeScript, but enforced at the database level.

The first argument (`"role"`) is the name of the enum type in PostgreSQL. The second argument is the array of allowed values.

Why use database-level enums instead of just storing strings?

1. **Data integrity.** The database will reject any value not in the list. Even if a bug in your code tries to insert `"admin"` (instead of `"super_admin"`), the database stops it.
2. **Storage efficiency.** Enums are stored as integers internally, not as full strings. A column with `"super_admin"` repeated 100,000 times uses less disk space as an enum than as a varchar.
3. **Documentation.** Looking at the enum definition tells you exactly what values are valid.

The file defines 11 enums total:

```typescript
export const roleEnum = pgEnum("role", ["super_admin", "ops_lead", "ops_engineer", "support", "finance", "viewer"]);
export const planEnum = pgEnum("plan", ["free", "starter", "business", "enterprise"]);
export const customerStatusEnum = pgEnum("customer_status", ["active", "suspended", "churned"]);
export const regionEnum = pgEnum("region", ["us-east", "us-west", "eu-west", "ap-south"]);
export const serviceStatusEnum = pgEnum("service_status", ["operational", "degraded", "major_outage", "maintenance"]);
export const incidentSeverityEnum = pgEnum("incident_severity", ["sev1", "sev2", "sev3", "sev4"]);
export const incidentStatusEnum = pgEnum("incident_status", ["declared", "investigating", "monitoring", "resolved", "postmortem"]);
export const operationStatusEnum = pgEnum("operation_status", ["draft", "pending_approval", "queued", "running", "completed", "failed", "cancelled", "rolled_back"]);
export const dangerLevelEnum = pgEnum("danger_level", ["safe", "moderate", "dangerous", "critical"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected", "expired"]);
export const flagTypeEnum = pgEnum("flag_type", ["boolean", "percentage", "targeted"]);
```

Notice the naming convention: the TypeScript variable is `camelCase` with `Enum` suffix, and the PostgreSQL name is `snake_case`. This is a common pattern -- TypeScript conventions use camelCase while SQL conventions use snake_case.

---

## Section 3: Operators Table (Lines 57-72)

```typescript
export const operators = pgTable(
  "operators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    role: roleEnum("role").notNull(),
    department: varchar("department", { length: 100 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("operators_email_uidx").on(table.email),
  }),
);
```

This is the first table definition, so let's break down every detail.

### `pgTable` Arguments

`pgTable` takes three arguments:

1. **`"operators"`** -- The table name in PostgreSQL. This is what you would use in raw SQL: `SELECT * FROM operators`.
2. **`{ ... }`** -- An object defining the columns. Each key is the TypeScript field name; the function call defines the PostgreSQL column.
3. **`(table) => ({ ... })`** -- A callback function that defines indexes and constraints. The `table` parameter gives you access to the columns you just defined, so you can reference them in indexes.

### Column Definitions Explained

**`id: uuid("id").primaryKey().defaultRandom()`**

- `uuid("id")` -- Creates a column named `"id"` in the database with type `UUID`.
- `.primaryKey()` -- Makes this the primary key. Every row must have a unique, non-null `id`.
- `.defaultRandom()` -- If you insert a row without specifying an `id`, PostgreSQL will automatically generate a random UUID using `gen_random_uuid()`. This means your application code does not need to generate IDs.

**Why UUIDs instead of auto-incrementing integers?** Integer IDs (`1, 2, 3, ...`) are simpler but have downsides: they leak information (a competitor can estimate how many users you have by signing up and looking at their ID), they cause conflicts when merging data from multiple databases, and they require a database round-trip to get the next ID. UUIDs solve all three problems. The tradeoff is they are larger (128 bits vs 32 bits) and slightly slower to index.

**`name: varchar("name", { length: 120 }).notNull()`**

- `varchar("name", { length: 120 })` -- A string column named `"name"` with a max length of 120 characters.
- `.notNull()` -- The column cannot be `NULL`. Every operator must have a name.

**Why set a length limit?** Even though PostgreSQL does not really perform differently with `VARCHAR(120)` vs `TEXT`, length limits serve as documentation and provide basic validation. A name should not be 10,000 characters long -- if someone tries to insert one, the database rejects it, which catches bugs.

**`email: varchar("email", { length: 255 }).notNull()`**

255 characters for email is a convention. The RFC for email addresses allows up to 254 characters, so 255 covers all valid emails.

**`role: roleEnum("role").notNull()`**

This column uses the `roleEnum` we defined earlier. In the database, the column is named `"role"` and its type is the `role` enum. Only values like `"super_admin"`, `"ops_lead"`, etc. are allowed.

**`isActive: boolean("is_active").notNull().default(true)`**

- `.default(true)` -- New operators are active by default. You can still explicitly set it to `false` when inserting.
- Notice the naming: TypeScript uses `isActive` (camelCase) but the database column is `"is_active"` (snake_case). Drizzle handles this mapping for you.

**`createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()`**

- `{ withTimezone: true }` -- This creates a `TIMESTAMPTZ` column instead of `TIMESTAMP`. The difference: `TIMESTAMPTZ` stores the time in UTC and converts it to the session's timezone when queried. `TIMESTAMP` stores the time as-is with no timezone awareness. Always use `withTimezone: true` unless you have a specific reason not to. Timezone bugs are painful.
- `.defaultNow()` -- Automatically set to the current time when the row is inserted.

**`updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()`**

Same as `createdAt`. Note that `.defaultNow()` only sets the value on insert. It does NOT automatically update when the row is modified. You need to explicitly set `updatedAt: new Date()` in your update queries, or create a database trigger. This is a common gotcha.

### The Index Callback

```typescript
(table) => ({
  emailIdx: uniqueIndex("operators_email_uidx").on(table.email),
}),
```

This creates a **unique index** on the `email` column. Two things happen:

1. **Uniqueness constraint.** No two operators can have the same email. The database will reject duplicate emails.
2. **Query performance.** Looking up an operator by email (`WHERE email = 'alice@example.com'`) becomes extremely fast -- O(log n) instead of O(n).

The naming convention `operators_email_uidx` encodes the table name, column name, and index type (`uidx` for unique index). This is a helpful convention because when you see an error message referencing `operators_email_uidx`, you immediately know which table and column are involved.

---

## Section 4: Permissions and Role-Permissions (Lines 74-97)

```typescript
export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 120 }).notNull(),
    description: text("description"),
  },
  (table) => ({
    keyIdx: uniqueIndex("permissions_key_uidx").on(table.key),
  }),
);
```

The permissions table is simple: each permission has a unique key (like `"incidents.create"` or `"customers.delete"`) and an optional description.

Notice that `description` has no `.notNull()` -- it is nullable. In TypeScript, Drizzle will type this as `string | null`.

```typescript
export const rolePermissions = pgTable(
  "role_permissions",
  {
    role: roleEnum("role").notNull(),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.role, table.permissionId] }),
  }),
);
```

This is a **join table** (also called a junction table, bridge table, or many-to-many table). It connects roles to permissions.

### Foreign Keys: `references()`

```typescript
.references(() => permissions.id, { onDelete: "cascade" })
```

This is a **foreign key constraint**. It says: the `permissionId` column must contain a value that exists in the `permissions.id` column. If you try to insert a `rolePermissions` row with a `permissionId` that does not exist in the `permissions` table, the database rejects it.

The `() => permissions.id` is a function (not just `permissions.id`) because of JavaScript module loading order. At the time this code runs, the `permissions` variable might not be defined yet. Wrapping it in a function defers the evaluation until it is actually needed.

**`{ onDelete: "cascade" }`** -- This controls what happens when the referenced row is deleted. If you delete a permission from the `permissions` table, all `rolePermissions` rows that reference it are automatically deleted too. Without this, deleting a permission would fail because other rows still reference it.

The alternatives to `cascade` are:

- **`restrict` (default)** -- Prevent the deletion entirely. You cannot delete the permission while any role references it.
- **`set null`** -- Set the foreign key column to `NULL` instead of deleting the row. Only works if the column is nullable.
- **`no action`** -- Similar to restrict but checked at the end of the transaction instead of immediately.

### Composite Primary Keys: `primaryKey()`

```typescript
pk: primaryKey({ columns: [table.role, table.permissionId] }),
```

This table does not have a single `id` column as its primary key. Instead, it uses a **composite primary key** -- the combination of `role` and `permissionId` together is the unique identifier.

This means:

- The pair `("ops_lead", "some-permission-uuid")` can appear at most once.
- But `"ops_lead"` can appear in many rows (with different permissions).
- And the same permission UUID can appear in many rows (with different roles).

Composite primary keys are the standard approach for join tables. Having a separate `id` column on a join table would be wasteful -- you would never look up a join table row by its own ID.

---

## Section 5: Accounts and Customers (Lines 99-138)

```typescript
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: varchar("company_name", { length: 180 }).notNull(),
    ownerName: varchar("owner_name", { length: 120 }).notNull(),
    ownerEmail: varchar("owner_email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerEmailIdx: index("accounts_owner_email_idx").on(table.ownerEmail),
  }),
);
```

Accounts represent the organization. A single account (company) can have multiple customers (think of it like a parent company with multiple subsidiaries, or a single company with multiple projects).

Notice `ownerEmailIdx` uses `index()` (not `uniqueIndex()`). Multiple accounts can share the same owner email -- maybe one person manages several accounts.

```typescript
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    companyName: varchar("company_name", { length: 180 }).notNull(),
    plan: planEnum("plan").notNull(),
    status: customerStatusEnum("status").notNull().default("active"),
    region: regionEnum("region").notNull(),
    industry: varchar("industry", { length: 80 }).notNull().default("other"),
    mrr: numeric("mrr", { precision: 12, scale: 2 }).notNull().default("0"),
    churnRiskScore: numeric("churn_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
    healthScore: numeric("health_score", { precision: 5, scale: 4 }).notNull().default("1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountIdx: index("customers_account_idx").on(table.accountId),
    planIdx: index("customers_plan_idx").on(table.plan),
    statusIdx: index("customers_status_idx").on(table.status),
    regionIdx: index("customers_region_idx").on(table.region),
  }),
);
```

The customers table is the most heavily indexed table in the schema -- four indexes. This makes sense because the dashboard likely filters and groups customers by account, plan, status, and region constantly.

### Understanding `numeric` Precision

```typescript
mrr: numeric("mrr", { precision: 12, scale: 2 }).notNull().default("0"),
```

- **`precision: 12`** -- Total number of digits (both sides of the decimal point).
- **`scale: 2`** -- Number of digits after the decimal point.
- So `numeric(12, 2)` can store values up to `9999999999.99` (10 digits before the decimal, 2 after).

```typescript
churnRiskScore: numeric("churn_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
```

- `numeric(5, 4)` stores values up to `9.9999`. Since churn risk is 0-1, this gives four decimal places of precision.

Notice the defaults are strings: `default("0")`, not `default(0)`. This is because PostgreSQL's `numeric` type maps to strings in JavaScript (to preserve exact precision). The number `0.1` in JavaScript is actually `0.1000000000000000055511151231257827021181583404541015625`. The string `"0.1"` is exactly `0.1`. For financial and score data, this precision matters.

### Why So Many Indexes?

Each index costs something: it uses disk space, and every `INSERT` / `UPDATE` / `DELETE` must update all affected indexes, making writes slightly slower. But for tables that are read frequently (like `customers`, which powers the dashboard), the read performance gain far outweighs the write cost.

The four indexes on `customers` suggest the app frequently filters by each of those columns:
- "Show me all customers on the enterprise plan" (uses `planIdx`)
- "Show me all churned customers" (uses `statusIdx`)
- "Show me all customers in EU West" (uses `regionIdx`)
- "Show me all customers for account X" (uses `accountIdx`)

---

## Section 6: Customer API Keys (Lines 140-155)

```typescript
export const customerApiKeys = pgTable(
  "customer_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }).notNull(),
    tokenPrefix: varchar("token_prefix", { length: 20 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("customer_api_keys_customer_idx").on(table.customerId),
  }),
);
```

This stores API keys that customers use to authenticate API calls. Notice something important: the table stores `tokenPrefix`, not the full token. The full token should be hashed before storage (like a password). The prefix (first few characters) is stored so users can identify which key is which in a list (like GitHub shows `ghp_abc...` for personal access tokens).

The `onDelete: "cascade"` means if a customer is deleted, all their API keys are deleted too. This makes sense -- you do not want orphaned keys that authenticate as a deleted customer.

---

## Section 7: Usage Records and Invoices (Lines 157-191)

```typescript
export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    serviceType: varchar("service_type", { length: 40 }).notNull(),
    quantity: integer("quantity").notNull(),
    totalCost: numeric("total_cost", { precision: 12, scale: 4 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("usage_records_customer_idx").on(table.customerId),
    recordedAtIdx: index("usage_records_recorded_at_idx").on(table.recordedAt),
  }),
);
```

Usage records track how much each customer uses each service. The `recordedAt` index is important because you often query usage "in the last 30 days" or "between period start and period end" -- time-range queries benefit hugely from indexes.

Note that `totalCost` uses `scale: 4` (four decimal places) while `mrr` uses `scale: 2`. Usage costs are often calculated at fractions of a cent (like $0.0001 per API call), so four decimal places makes sense.

```typescript
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("invoices_customer_idx").on(table.customerId),
  }),
);
```

Invoices bill customers for a specific period. Note that `status` is a plain `varchar` here, not an enum. This is a design inconsistency -- most other status columns in the schema use enums. It could be intentional (invoice statuses might change frequently and enums are hard to alter in PostgreSQL) or it could be an oversight. In a real code review, this is worth flagging and asking about.

---

## Section 8: Credit Adjustments and Disputes (Lines 193-231)

```typescript
export const creditAdjustments = pgTable(
  "credit_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => operators.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("credit_adjustments_customer_idx").on(table.customerId),
  }),
);
```

Credit adjustments are refunds or credits applied to a customer's account. Notice two different foreign key behaviors:

- **`customerId` uses `onDelete: "cascade"`** -- If the customer is deleted, delete their credits too.
- **`invoiceId` uses `onDelete: "set null"`** -- If the invoice is deleted, keep the credit adjustment but set its `invoiceId` to `NULL`. This makes sense because a credit might be applied to an invoice, but you might void the invoice later without wanting to lose the record that a credit was issued.
- **`createdBy` has no `onDelete` option** -- This defaults to `restrict`. You cannot delete an operator if they have created credit adjustments. This is intentional: you want to preserve the audit trail of who issued credits.

These three different behaviors on the same table are a great example of how foreign key strategies are not one-size-fits-all. You need to think about each relationship individually.

```typescript
export const disputes = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 30 }).notNull().default("open"),
    reason: text("reason").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => ({
    customerIdx: index("disputes_customer_idx").on(table.customerId),
  }),
);
```

Disputes are when a customer contests an invoice. `closedAt` is nullable -- it starts as `NULL` and gets filled in when the dispute is resolved. This "nullable timestamp for completion" pattern appears throughout the schema (`resolvedAt`, `finishedAt`, `decidedAt`, etc.).

---

## Section 9: Services and Health Checks (Lines 233-262)

```typescript
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  ownerTeam: varchar("owner_team", { length: 120 }).notNull(),
  status: serviceStatusEnum("status").notNull().default("operational"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

This is the only table so far defined without the third argument (the index callback). That means it has no indexes beyond the primary key. This might be fine if the services table is small (dozens of rows, not millions), but if you frequently look up services by `slug`, adding an index would be a good idea.

The `slug` is a URL-friendly version of the name (like `"voice-api"` for "Voice API"). Slugs are used in URLs and API paths.

```typescript
export const serviceHealthChecks = pgTable(
  "service_health_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    region: regionEnum("region").notNull(),
    latencyP50Ms: numeric("latency_p50_ms", { precision: 10, scale: 2 }).notNull(),
    latencyP95Ms: numeric("latency_p95_ms", { precision: 10, scale: 2 }).notNull(),
    errorRate: numeric("error_rate", { precision: 8, scale: 5 }).notNull(),
    cpuPercent: numeric("cpu_percent", { precision: 5, scale: 2 }).notNull(),
    memoryPercent: numeric("memory_percent", { precision: 5, scale: 2 }).notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    serviceIdx: index("service_health_checks_service_idx").on(table.serviceId),
    checkedAtIdx: index("service_health_checks_checked_at_idx").on(table.checkedAt),
  }),
);
```

Health checks are periodic snapshots of a service's performance in a specific region. This is a time-series-like table -- new rows are constantly being inserted, and queries typically ask "what was the latency for Voice API in us-east over the last hour?"

The `checkedAt` index is critical for these time-range queries. Without it, the database would scan every health check ever recorded to find the ones in your time window.

---

## Section 10: Incidents and Timeline (Lines 264-302)

```typescript
export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 240 }).notNull(),
    summary: text("summary").notNull(),
    severity: incidentSeverityEnum("severity").notNull(),
    status: incidentStatusEnum("status").notNull().default("declared"),
    commanderId: uuid("commander_id").references(() => operators.id, { onDelete: "set null" }),
    affectedRegions: text("affected_regions")
      .array()
      .notNull()
      .default(["us-east"]),
    affectedCustomerCount: integer("affected_customer_count").notNull().default(0),
    declaredAt: timestamp("declared_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index("incidents_status_idx").on(table.status),
    severityIdx: index("incidents_severity_idx").on(table.severity),
  }),
);
```

### Array Columns

```typescript
affectedRegions: text("affected_regions").array().notNull().default(["us-east"]),
```

`.array()` creates a PostgreSQL array column. This stores a list of text values in a single column, like `["us-east", "eu-west"]`. It is useful when a row can have multiple values for a field but you do not want to create a separate join table.

The tradeoff: array columns are harder to query and index than join tables. You can search them with PostgreSQL's array operators (`@>`, `&&`, etc.), but it is less flexible than a proper many-to-many relationship. For a small, bounded set of values (like regions), an array is a pragmatic choice.

### Nullable Foreign Keys

```typescript
commanderId: uuid("commander_id").references(() => operators.id, { onDelete: "set null" }),
```

`commanderId` is nullable (no `.notNull()`). An incident might not have a commander assigned yet, or the operator who was commander might have been removed (`set null`).

```typescript
export const incidentTimeline = pgTable(
  "incident_timeline",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    entryType: varchar("entry_type", { length: 40 }).notNull(),
    message: text("message").notNull(),
    createdBy: uuid("created_by").references(() => operators.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    incidentIdx: index("incident_timeline_incident_idx").on(table.incidentId),
  }),
);
```

The incident timeline is an append-only log of events during an incident (like "Status changed to investigating", "Commander assigned: Alice", "Root cause identified: DNS failure"). Each entry has a type (for filtering and display) and a message.

---

## Section 11: Operations and Operation Logs (Lines 304-347)

```typescript
export const operations = pgTable(
  "operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    command: varchar("command", { length: 120 }).notNull(),
    status: operationStatusEnum("status").notNull().default("draft"),
    dangerLevel: dangerLevelEnum("danger_level").notNull().default("safe"),
    dryRun: boolean("dry_run").notNull().default(true),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => operators.id),
    approvedBy: uuid("approved_by").references(() => operators.id, { onDelete: "set null" }),
    idempotencyKey: varchar("idempotency_key", { length: 120 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index("operations_status_idx").on(table.status),
    idempotencyKeyIdx: uniqueIndex("operations_idempotency_key_uidx").on(table.idempotencyKey),
  }),
);
```

### Idempotency Keys

```typescript
idempotencyKey: varchar("idempotency_key", { length: 120 }).notNull(),
// ...
idempotencyKeyIdx: uniqueIndex("operations_idempotency_key_uidx").on(table.idempotencyKey),
```

This is a production safety pattern. An **idempotency key** ensures an operation is not accidentally executed twice. If a network glitch causes a retry, the second attempt will have the same idempotency key. The unique index rejects the duplicate insert, preventing the operation from running twice.

For example, if you send a "transfer $1000" operation with idempotency key `"transfer-abc123"`, and the response is lost so the client retries, the second attempt also sends `"transfer-abc123"`. The database rejects the duplicate, and $1000 is only transferred once.

### `dryRun` Default

```typescript
dryRun: boolean("dry_run").notNull().default(true),
```

New operations default to dry-run mode. This is a safety-first design: unless you explicitly say "this is real", the system assumes you are just testing. This prevents accidental execution of dangerous operations.

### `jsonb` for Flexible Data

```typescript
payload: jsonb("payload").notNull().default({}),
```

Operations can carry arbitrary data in their `payload`. Using `jsonb` means you do not need to define a fixed schema for every type of operation. A "restart server" operation might have `{ "serverId": "abc" }`, while a "send email" operation might have `{ "to": "user@example.com", "subject": "..." }`.

The downside: `jsonb` is not type-checked by the database. You could store `{ "typo": true }` and PostgreSQL would accept it. Use it for genuinely flexible data, not as a shortcut to avoid defining proper columns.

```typescript
export const operationLogs = pgTable(
  "operation_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operationId: uuid("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 80 }).notNull(),
    targetId: varchar("target_id", { length: 120 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    message: text("message").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    operationIdx: index("operation_logs_operation_idx").on(table.operationId),
  }),
);
```

Operation logs record what happened during an operation. The `oldValue` / `newValue` pair stores the before/after state, which is valuable for debugging and rollback. Both are nullable `jsonb` -- some log entries might not have a before/after (like "started operation").

---

## Section 12: Approvals (Lines 349-370)

```typescript
export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operationId: uuid("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => operators.id),
    reviewerId: uuid("reviewer_id").references(() => operators.id, { onDelete: "set null" }),
    status: approvalStatusEnum("status").notNull().default("pending"),
    decisionNote: text("decision_note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    operationIdx: index("approvals_operation_idx").on(table.operationId),
    statusIdx: index("approvals_status_idx").on(table.status),
  }),
);
```

Approvals implement a "four-eyes principle" -- dangerous operations must be approved by someone other than the requester before they can run. The `expiresAt` field means approvals do not last forever -- if nobody reviews an operation within the deadline, it expires.

Notice `reviewerId` is nullable with `set null`. An approval starts with no reviewer (it is pending). When someone reviews it, their `operator_id` is filled in. If that reviewer is later deleted from the system, the approval record stays but the reviewer becomes `NULL`.

---

## Section 13: Feature Flags (Lines 372-392)

```typescript
export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 140 }).notNull(),
    description: text("description").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => operators.id),
    flagType: flagTypeEnum("flag_type").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(false),
    rolloutPercentage: integer("rollout_percentage").notNull().default(0),
    targetingRules: jsonb("targeting_rules").notNull().default([]),
    staleThresholdDays: integer("stale_threshold_days").notNull().default(30),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    keyIdx: uniqueIndex("feature_flags_key_uidx").on(table.key),
  }),
);
```

Feature flags let you turn features on/off without deploying new code. The three `flagType` values enable different strategies:

- **`"boolean"`** -- Simple on/off for everyone.
- **`"percentage"`** -- Roll out to a percentage of users (controlled by `rolloutPercentage`).
- **`"targeted"`** -- Roll out to specific users or segments (controlled by `targetingRules` jsonb).

`staleThresholdDays` is a nice touch -- it tracks how many days a flag can go without being updated before it is considered "stale" (abandoned). Stale flags are a common source of tech debt -- teams enable a flag, forget about it, and years later nobody knows if it is safe to remove.

New flags default to `isEnabled: false` -- another safety-first design. You create the flag, wire up the code, and then explicitly enable it.

---

## Section 14: Runbooks and Executions (Lines 394-431)

```typescript
export const runbooks = pgTable(
  "runbooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    steps: jsonb("steps").notNull().default([]),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => operators.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    titleIdx: index("runbooks_title_idx").on(table.title),
  }),
);
```

Runbooks are documented procedures for handling specific situations (like "how to restart the billing service" or "how to investigate a SEV1 incident"). `steps` is `jsonb` because runbook steps have a complex, variable structure (markdown text, commands to run, checkboxes, expected outputs, etc.) that does not fit neatly into relational columns.

The `version` field enables versioning. When a runbook is updated, you increment the version so you can track which version was used for each execution.

```typescript
export const runbookExecutions = pgTable(
  "runbook_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runbookId: uuid("runbook_id")
      .notNull()
      .references(() => runbooks.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 30 }).notNull().default("running"),
    context: jsonb("context").notNull().default({}),
    startedBy: uuid("started_by")
      .notNull()
      .references(() => operators.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => ({
    runbookIdx: index("runbook_executions_runbook_idx").on(table.runbookId),
  }),
);
```

Each execution records who ran the runbook, when, and the context (any input parameters or state relevant to that specific execution). The nullable `finishedAt` tells you whether it is still running.

---

## Section 15: Audit Log (Lines 433-458)

```typescript
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => operators.id),
    action: varchar("action", { length: 150 }).notNull(),
    resourceType: varchar("resource_type", { length: 80 }).notNull(),
    resourceId: varchar("resource_id", { length: 120 }).notNull(),
    resourceLabel: varchar("resource_label", { length: 255 }),
    dangerLevel: dangerLevelEnum("danger_level").notNull().default("safe"),
    requestId: varchar("request_id", { length: 120 }),
    ipAddress: varchar("ip_address", { length: 80 }),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt),
    actionIdx: index("audit_log_action_idx").on(table.action),
    resourceTypeIdx: index("audit_log_resource_type_idx").on(table.resourceType),
  }),
);
```

The audit log records every significant action taken in the system. This is one of the most important tables for security and compliance.

Key design decisions:

- **`operatorId` references `operators` without `onDelete`** -- Defaults to `restrict`. You cannot delete an operator who has audit log entries. This is correct: the audit trail must be preserved.
- **Three indexes** -- The audit log is queried by time range ("what happened in the last hour?"), by action ("who deleted customers?"), and by resource type ("all operations on invoices"). Each query pattern gets its own index.
- **`requestId`** -- Ties the audit entry to a specific HTTP request. If the same request triggers multiple actions, they share a `requestId`, making it easy to reconstruct what happened in a single API call.
- **`ipAddress` and `userAgent`** -- For security investigations: "Who accessed the system from this IP?" or "Was this action taken from a browser or an API client?"
- **`oldValue` / `newValue`** -- The before/after state, just like in operation logs. This makes it possible to see exactly what changed.
- **`resourceType` + `resourceId` + `resourceLabel`** -- A "polymorphic" reference pattern. Instead of having a separate foreign key for every table, the audit log stores the type (like `"customer"`), the ID (like `"uuid-abc"`), and a human-readable label (like `"Acme Telecom Labs"`). This lets one table track changes across the entire system.

---

## Concepts Taught (Summary)

| Concept | Where it appears |
|---|---|
| **`pgTable`** | Every table definition |
| **`pgEnum`** | 11 enum definitions at the top |
| **Column types** | `uuid`, `varchar`, `text`, `boolean`, `integer`, `numeric`, `timestamp`, `jsonb` |
| **Primary keys** | `uuid("id").primaryKey().defaultRandom()` on every table |
| **Composite primary keys** | `rolePermissions` table |
| **Foreign keys** | `.references(() => table.id, { onDelete: "..." })` throughout |
| **Cascade delete** | `onDelete: "cascade"` -- delete children when parent is deleted |
| **Set null on delete** | `onDelete: "set null"` -- keep the row but clear the reference |
| **Restrict on delete** | Default behavior -- prevent deletion while references exist |
| **Indexes** | `index()` for query performance |
| **Unique indexes** | `uniqueIndex()` for uniqueness + performance |
| **Array columns** | `text("...").array()` on incidents |
| **JSONB columns** | `payload`, `targetingRules`, `steps`, `metadata`, `oldValue`, `newValue` |
| **Nullable vs non-nullable** | `.notNull()` vs omitting it |
| **Default values** | `.default(true)`, `.defaultNow()`, `.defaultRandom()`, `.default("0")` |
| **Timestamp with timezone** | `{ withTimezone: true }` on every timestamp |
| **snake_case vs camelCase** | Database columns are snake_case, TypeScript fields are camelCase |
| **Idempotency** | `idempotencyKey` on operations |
| **Polymorphic references** | `resourceType` + `resourceId` on audit log |

---

## Common Mistakes

1. **Forgetting `.notNull()`.** If you omit `.notNull()`, the column allows `NULL` values, and Drizzle types the field as `T | null`. This affects every query and component that touches the field. Be deliberate about nullability.

2. **Using `onDelete: "cascade"` everywhere.** Cascade deletes are convenient but dangerous. Deleting one parent row can trigger a chain reaction that wipes out thousands of child rows. Use `cascade` for data that truly belongs to the parent (API keys belong to a customer). Use `restrict` for data you want to protect (audit logs must not be deleted).

3. **Forgetting to add indexes for common queries.** If the dashboard filters customers by `region` and there is no index on `region`, the database scans the entire table for every request. Always think about how data will be queried and add indexes for those patterns.

4. **Adding too many indexes.** Every index slows down writes. A table with 10 indexes has to update 10 indexes on every insert. For high-write tables (like `usageRecords` or `auditLog`), be selective about which indexes you add.

5. **Using `integer` for money.** An integer can only hold whole numbers. If you store dollars as integers, you lose cents. If you store cents as integers, you need to divide by 100 everywhere. Use `numeric(precision, scale)` for money.

6. **Forgetting that `numeric` returns strings in JavaScript.** PostgreSQL's `numeric` type maps to JavaScript `string` in node-postgres (to preserve precision). If your code does `customer.mrr + 100`, you get `"0100"` (string concatenation) instead of `100` (addition). Parse it first: `Number(customer.mrr) + 100`.

7. **Not matching schema enums with TypeScript types.** The mock data file defines `type CustomerPlan = "free" | "starter" | "business" | "enterprise"`. The schema defines `planEnum` with the same values. If someone adds a fifth plan to one but not the other, things break. Consider deriving TypeScript types from the Drizzle schema to keep them in sync.

8. **Using `TIMESTAMP` without timezone.** If your server is in UTC, your database is in US/Eastern, and your user is in Tokyo, a timezone-naive timestamp becomes ambiguous. Always use `{ withTimezone: true }`.

---

## Mini Exercises

### Exercise 1: Add a New Table

Define a `supportTickets` table with: `id` (uuid PK), `customerId` (FK to customers, cascade delete), `subject` (varchar 240), `body` (text), `priority` (use a new enum: "low", "medium", "high", "urgent"), `status` (varchar), `assignedTo` (FK to operators, set null), `createdAt`, `updatedAt`. Add an index on `customerId`.

### Exercise 2: Trace the Cascade Chain

Starting from the `accounts` table, trace what happens when you delete an account:
1. Customers are cascade-deleted.
2. What happens to each customer's API keys? Usage records? Invoices?
3. What happens to the invoices' credit adjustments and disputes?
4. Write out the full chain of deletions.

### Exercise 3: Find the Design Inconsistency

The schema uses `pgEnum` for most status fields but uses `varchar` for some (`invoices.status`, `disputes.status`, `operationLogs.status`, `runbookExecutions.status`). Pick one of these and argue for or against converting it to an enum. Consider: How often do the valid statuses change? How many distinct values are there? Would an enum make queries safer?

---

## Further Reading

- **Drizzle schema docs:** [orm.drizzle.team/docs/sql-schema-declaration](https://orm.drizzle.team/docs/sql-schema-declaration) covers all the column types and modifiers.
- **PostgreSQL data types:** The [PostgreSQL type docs](https://www.postgresql.org/docs/current/datatype.html) explain every type in detail.
- **Database normalization:** Search for "database normalization 1NF 2NF 3NF" to understand why data is split across multiple tables instead of stored in one big table.
- **Indexes explained:** [Use The Index, Luke](https://use-the-index-luke.com/) is the best free resource for understanding database indexes.
- **UUID vs auto-increment:** Search for "UUID vs integer primary key tradeoffs" for a balanced discussion of the pros and cons.
- **Foreign key strategies:** The [PostgreSQL FK docs](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK) explain all the `ON DELETE` and `ON UPDATE` options.
- **JSONB in PostgreSQL:** The [PostgreSQL JSON docs](https://www.postgresql.org/docs/current/datatype-json.html) explain when to use `json` vs `jsonb` and how to query JSON data.
