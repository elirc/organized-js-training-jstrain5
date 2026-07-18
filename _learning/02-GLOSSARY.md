# OpsForge — Concepts Glossary

Every technical term used across the learning guides, explained in plain English with examples from this project.

---

### API (Application Programming Interface)
A set of URLs that a program can call to get or send data. In OpsForge, the API lives at `src/app/api/`. When the browser wants customer data, it sends an HTTP request to `/api/customers` and gets JSON back.

```typescript
// From src/app/api/dashboard/kpis/route.ts
export async function GET() {
  return NextResponse.json(ok(dashboardKpis));
}
```
The browser calls `GET /api/dashboard/kpis` and receives KPI data. That's the API in action.

---

### API Route (Next.js)
A file inside `src/app/api/` that defines server-side functions to handle HTTP requests. Each exported function name corresponds to an HTTP method.

```typescript
// From src/app/api/customers/route.ts
export async function GET(req: NextRequest) { ... }  // Handles GET requests
export async function POST() { ... }                  // Handles POST requests
```

---

### App Router (Next.js)
Next.js 14's routing system where the folder structure defines the URL structure. A file at `src/app/(app)/customers/page.tsx` creates the URL `/customers`. The `(app)` parentheses make it a "route group" that doesn't appear in the URL.

---

### `as const` (TypeScript)
Tells TypeScript to treat a value as its most specific, readonly type instead of a general one. Without it, TypeScript widens the type.

```typescript
// From src/lib/mock/dashboard.ts
export const dashboardKpis = [
  { label: "Active Customers", value: "44,983", trend: "+0.8% vs 7d" },
  // ...
] as const;
// Type is readonly [{ readonly label: "Active Customers"; ... }, ...]
// Without `as const`, type would be { label: string; value: string; trend: string }[]
```

---

### Asynchronous (async/await)
Code that can pause and wait for something (like a database query or API call) without blocking everything else. The `async` keyword marks a function that contains waiting points; `await` marks where it waits.

```typescript
// From src/lib/auth/middleware.ts
export async function requirePermission(permission: PermissionKey) {
  const session = await auth();  // Pauses here until session is retrieved
  // ... continues after session is available
}
```

---

### Authentication
Verifying WHO someone is. "Are you really Alex Rivera?" In OpsForge, this happens via email + password on the login page.

```typescript
// From src/lib/auth/config.ts
authorize: async (rawCredentials) => {
  const operator = operators.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!operator || password !== DEFAULT_OPERATOR_PASSWORD) return null;  // Auth failed
  return { id: operator.id, name: operator.name, ... };  // Auth succeeded
}
```

---

### Authorization
Verifying WHAT someone is allowed to do. "Alex is a super_admin, so they can manage settings." In OpsForge, this is handled by the RBAC system.

```typescript
// From src/lib/auth/rbac.ts
export function hasPermission(role: Role, permission: PermissionKey) {
  return rolePermissions[role]?.includes(permission) ?? false;
}
```

---

### BullMQ
A job queue library for Node.js that uses Redis to manage background tasks. Think of it as a to-do list for the server: the web app adds items, and a worker process checks them off.

```typescript
// From worker/index.ts
const operationQueue = new Queue("opsforge-operations", { connection: redisConnection });
// Web app adds jobs to this queue
// Worker picks them up and processes them
```

---

### Callback
A function you pass to another function to be called later. In OpsForge, NextAuth uses callbacks to customize what data gets stored in the JWT token and session.

```typescript
// From src/lib/auth/config.ts
callbacks: {
  jwt: async ({ token, user }) => {
    if (user) {
      token.role = (user as { role?: string }).role;  // Called when JWT is created
    }
    return token;
  },
}
```

---

### Client Component
A React component that runs in the browser. Marked with `"use client"` at the top of the file. Can use hooks like `useState`, handle events, and access browser APIs.

```typescript
// From src/components/opsforge-nav.tsx
"use client";  // This component runs in the browser
import { usePathname } from "next/navigation";  // Browser-only hook
```

---

### Command Pattern
A design pattern where each action is wrapped in an object with a standard interface. Instead of a giant `if/else` chain, each operation is its own module that can be executed uniformly.

```typescript
// From src/lib/operations/commands/base.ts
export type OperationCommand = {
  key: string;
  dryRun: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  execute: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
};
```

---

### Connection Pool
A collection of pre-opened database connections that get reused instead of opening a new connection for every request. Opening a connection is slow; reusing is fast.

```typescript
// From src/lib/db/index.ts
const pool = new Pool({
  connectionString,
  max: 20,  // Keep up to 20 connections open and ready
});
```

---

### CSS Custom Properties (CSS Variables)
Values defined with `--name` syntax that can be reused throughout your CSS. Changing the variable changes everywhere it's used — perfect for theming.

```css
/* From src/app/globals.css */
:root {
  --accent: #005ecb;       /* Blue in light mode */
}
@media (prefers-color-scheme: dark) {
  :root {
    --accent: #5ca8ff;     /* Lighter blue in dark mode */
  }
}
```

---

### Cursor-Based Pagination
A way to split large lists into pages using a pointer ("cursor") to the last item seen, rather than page numbers. More reliable than offset pagination when data changes between requests.

```typescript
// From src/app/api/customers/route.ts
const startIndex = cursor ? rows.findIndex((item) => item.id === cursor) + 1 : 0;
const page = rows.slice(startIndex, startIndex + limit);
const nextCursor = page.length === limit ? page[page.length - 1]?.id : null;
```

---

### Dependency Injection
A pattern where a module receives its dependencies from outside rather than creating them internally. The command registry is a light form of this — commands are registered from outside.

```typescript
// From src/lib/operations/commands/registry.ts
export function registerCommand(command: OperationCommand) {
  registry.set(command.key, command);  // Command is "injected" into the registry
}
```

---

### Discriminated Union
A TypeScript pattern where a union type has a shared property (the "discriminant") that tells you which variant you have. The API envelope is a textbook example.

```typescript
// From src/lib/http/envelope.ts
export type ApiResponse<T> =
  | { success: true; data: T }        // If success is true, `data` exists
  | { success: false; error: ApiError } // If success is false, `error` exists
```

---

### Docker / Docker Compose
Docker packages software into isolated containers (like mini virtual machines). Docker Compose orchestrates multiple containers together. OpsForge uses it to run PostgreSQL, Redis, the app, and the worker simultaneously.

```yaml
# From docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
  redis:
    image: redis:7-alpine
  app:
    depends_on:
      - postgres
      - redis
```

---

### Drizzle ORM
An Object-Relational Mapper that lets you define database tables in TypeScript and query them with type-safe JavaScript instead of raw SQL strings.

```typescript
// From src/lib/db/schema.ts — defining a table
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: varchar("company_name", { length: 180 }).notNull(),
  plan: planEnum("plan").notNull(),
});
```

---

### Dry Run
A simulation mode that shows what WOULD happen without actually doing it. Like a "preview" for dangerous operations. Essential for admin tools where mistakes are costly.

```typescript
// From src/lib/operations/commands/customer-plan-change.ts
dryRun: async (payload) => ({
  mode: "dry-run",
  payload,
  message: "Simulation complete for customer-plan-change.",
}),
```

---

### Enum (Database)
A column type that restricts values to a predefined set. Like a dropdown menu for the database — you can only pick from the allowed options.

```typescript
// From src/lib/db/schema.ts
export const planEnum = pgEnum("plan", ["free", "starter", "business", "enterprise"]);
// The `plan` column can ONLY contain one of these 4 values
```

---

### Environment Variable
A configuration value set outside of code, usually in a `.env` file. Used for things that change between environments (dev vs production) or that should stay secret.

```
# From .env.example
DATABASE_URL=postgresql://opsforge:opsforge_dev@localhost:5432/opsforge
NEXTAUTH_SECRET=change-me
```

---

### Feature Flag
A mechanism to turn features on or off without deploying new code. Can be boolean (on/off), percentage-based (show to 50% of users), or targeted (show to specific customers).

```typescript
// From src/lib/feature-flags/evaluator.ts
export function evaluateFlag(flag: FeatureFlag, customer: Customer): boolean {
  if (!flag.isEnabled) return false;
  if (flag.flagType === "boolean") return true;
  if (flag.flagType === "percentage") {
    const bucket = hashToBucket(flag.key, customer.id);
    return bucket < flag.rolloutPercentage;
  }
  // ... targeted evaluation
}
```

---

### Foreign Key
A column in one table that references the primary key of another table. Creates a relationship between tables and prevents orphaned data.

```typescript
// From src/lib/db/schema.ts
accountId: uuid("account_id")
  .notNull()
  .references(() => accounts.id, { onDelete: "cascade" }),
// "This customer belongs to an account. If the account is deleted, delete the customer too."
```

---

### Generic Type (TypeScript)
A type that takes a parameter, like a function but for types. Written with angle brackets `<T>`. Lets you write one definition that works with many types.

```typescript
// From src/lib/http/envelope.ts
export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}
// ok("hello") returns ApiResponse<string>
// ok(42) returns ApiResponse<number>
// ok(customers) returns ApiResponse<Customer[]>
```

---

### Hash Function
A function that converts input into a fixed-size number. The same input always produces the same output. Used in OpsForge for deterministic feature flag bucketing.

```typescript
// From src/lib/feature-flags/rollout.ts
export function hashToBucket(flagKey: string, customerId: string) {
  const source = `${flagKey}:${customerId}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;  // Convert to 32-bit integer
  }
  return Math.abs(hash % 100);  // Returns 0-99
}
```

---

### Idempotency / Idempotency Key
An operation is idempotent if running it multiple times has the same effect as running it once. The idempotency key is a unique identifier that prevents the same operation from executing twice.

```typescript
// From src/lib/db/schema.ts
idempotencyKey: varchar("idempotency_key", { length: 120 }).notNull(),
// If you accidentally submit "suspend customer X" twice with the same key,
// only the first one executes. The second is rejected as a duplicate.
```

---

### Index (Database)
A data structure that speeds up searches on specific columns, like a book index that lets you find topics without reading every page. Costs extra storage and slightly slower writes.

```typescript
// From src/lib/db/schema.ts
(table) => ({
  statusIdx: index("customers_status_idx").on(table.status),
  // "Create a lookup table for the status column so WHERE status = 'active' is fast"
})
```

---

### JWT (JSON Web Token)
A compact, self-contained way to transmit user identity between server and client. It's a signed string that contains user data (like role and email). The server signs it with a secret; if anyone tampers with it, the signature breaks.

```typescript
// From src/lib/auth/config.ts
session: { strategy: "jwt" },
// Sessions are stored as JWTs in cookies, not in a database
```

---

### Layout (Next.js)
A component that wraps all pages in a given route segment. Layouts persist across page navigations — the sidebar doesn't re-render when you switch pages.

```typescript
// From src/app/(app)/layout.tsx
export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside>...</aside>      {/* Sidebar — always visible */}
      <main>{children}</main>  {/* Page content — changes per route */}
    </div>
  );
}
```

---

### Middleware (Next.js)
Code that runs BEFORE any route handler. Like a security guard at the building entrance — checks your badge before you can go anywhere.

```typescript
// From middleware.ts
export default auth((req) => {
  if (!isPublic && !req.auth) {
    return NextResponse.redirect(loginUrl);  // No badge? Go to login.
  }
  return NextResponse.next();  // Badge checks out. Proceed.
});
```

---

### Module Augmentation (TypeScript)
Extending an existing type definition from a third-party library. You're saying "hey TypeScript, that `Session` type? It also has these extra fields."

```typescript
// From src/types/next-auth.d.ts
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;        // We added this
      department: string;  // We added this
    };
  }
}
```

---

### ORM (Object-Relational Mapper)
A library that lets you interact with a database using your programming language instead of SQL. Tables become objects, rows become instances, queries become method calls.

---

### Path Alias
A shortcut for imports so you don't have to write `../../../lib/db/schema`. In OpsForge, `@/*` maps to `./src/*`.

```typescript
// Instead of this:
import { db } from "../../../lib/db";
// You write this:
import { db } from "@/lib/db";
```

---

### RBAC (Role-Based Access Control)
A permission system where users are assigned roles, and roles have permissions. Instead of checking "can user X do action Y?" for every user, you check "does user X's role include permission Y?"

```typescript
// From src/lib/auth/rbac.ts
const rolePermissions: Record<Role, PermissionKey[]> = {
  super_admin: [...permissionKeys],  // Can do everything
  viewer: ["dashboard.read", "customers.read"],  // Can only view
};
```

---

### Rate Limiting
Restricting how many actions a user can perform in a time window. Prevents both abuse and accidental mass operations.

```typescript
// From src/lib/operations/rate-limiter.ts
export async function checkRateLimit(operatorId: string, command: string) {
  return { allowed: true, remaining: 10, operatorId, command };
}
```

---

### Read Model / Materialized View
A pre-computed summary of data optimized for reading. Instead of calculating "total customers per region" from scratch every request, you compute it periodically and serve the cached result.

```typescript
// From src/lib/db/read-models/customer-summary.ts
export async function refreshCustomerSummaryReadModel() {
  return { refreshedAt: new Date().toISOString(), readModel: "customer_summary_mv" };
}
```

---

### Registry Pattern
A central lookup table where modules register themselves. Other code can look up modules by key without needing to know about all implementations.

```typescript
// From src/lib/operations/commands/registry.ts
const registry = new Map<string, OperationCommand>();
export function registerCommand(command: OperationCommand) {
  registry.set(command.key, command);
}
export function getCommand(key: string) {
  return registry.get(key);
}
```

---

### Route Group (Next.js)
A folder wrapped in parentheses like `(auth)` or `(app)` that organizes routes WITHOUT affecting the URL. `src/app/(app)/customers/page.tsx` serves the URL `/customers`, not `/(app)/customers`.

---

### `satisfies` (TypeScript)
A keyword that validates a value matches a type WITHOUT widening it. Catches type errors while preserving the specific literal types.

```typescript
// From src/lib/auth/config.ts
export const authConfig = { ... } satisfies NextAuthConfig;
// TypeScript checks that authConfig matches NextAuthConfig's shape
// But authConfig keeps its specific types (not widened to NextAuthConfig)
```

---

### Schema (Database)
The blueprint that defines what tables exist, what columns they have, and what types those columns accept. Like an architect's floor plan.

```typescript
// From src/lib/db/schema.ts
export const operators = pgTable("operators", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: roleEnum("role").notNull(),
});
```

---

### Server Component (Next.js)
A React component that runs only on the server. Can directly access databases, files, and secrets. Cannot use browser APIs or React hooks. This is the default in Next.js App Router.

```typescript
// From src/app/(app)/layout.tsx — NO "use client" directive = server component
export default async function AppLayout({ children }) {
  const session = await auth();  // Can call async functions directly
}
```

---

### Server-Sent Events (SSE)
A one-way communication channel where the server pushes updates to the browser. Unlike WebSockets (two-way), SSE only goes server → client.

```typescript
// From src/app/api/events/stream/route.ts
const stream = new ReadableStream({
  start(controller) {
    const interval = setInterval(() => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    }, 5000);
  },
});
```

---

### `"server-only"` (Import)
A special import that causes a build error if you accidentally import server-side code into a client component. A safety net.

```typescript
// From src/lib/db/index.ts
import "server-only";  // If any client component imports db/index.ts, the build BREAKS
```

---

### Type Assertion (`as`)
Telling TypeScript "trust me, I know what type this is." Use sparingly — it bypasses type checking.

```typescript
// From src/lib/auth/config.ts
token.role = (user as { role?: string }).role;
// TypeScript doesn't know `user` has a `role` field, so we assert it does
```

---

### Union Type
A type that can be one of several types. Written with `|` (pipe).

```typescript
// From src/lib/mock/customers.ts
export type CustomerStatus = "active" | "suspended" | "churned";
// A CustomerStatus can be "active" OR "suspended" OR "churned" — nothing else
```

---

### UUID (Universally Unique Identifier)
A 128-bit identifier that's practically guaranteed to be unique worldwide. Looks like: `550e8400-e29b-41d4-a716-446655440000`. Used as primary keys instead of auto-incrementing numbers.

```typescript
// From src/lib/db/schema.ts
id: uuid("id").primaryKey().defaultRandom(),
// PostgreSQL generates a random UUID for each new row
```

---

### Zod
A TypeScript-first schema validation library. Defines what shape data should have and validates it at runtime (TypeScript only checks at compile time).

```typescript
// From src/app/api/customers/route.ts
const querySchema = z.object({
  search: z.string().optional(),
  plan: z.enum(["free", "starter", "business", "enterprise"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
// If someone sends limit=999, Zod catches it: "Number must be less than or equal to 100"
```
