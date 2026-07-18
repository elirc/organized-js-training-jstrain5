# OpsForge — Patterns & Anti-Patterns

Design patterns actually used in this codebase, with honest assessment of what's done well and what could be better.

---

## Patterns Used

### 1. Envelope Pattern (API Response Wrapper)

**What it is:** Every API response is wrapped in the same predictable shape. Success or failure, you always know what to expect.

**Where it's used:** `src/lib/http/envelope.ts`, every API route

```typescript
// The pattern
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }

// Usage in an API route (src/app/api/dashboard/kpis/route.ts)
return NextResponse.json(ok(dashboardKpis));

// Usage for errors (src/app/api/customers/route.ts)
return NextResponse.json(fail("VALIDATION_ERROR", parseResult.error.message), { status: 400 });
```

**Why it matters:** The frontend never has to guess what shape the response is. You check `response.success` and you know exactly what's there. This eliminates an entire class of bugs where the frontend crashes because it expected `data.items` but got `data.error`.

**Real-world comparison:** Imagine if every package you received — Amazon, UPS, FedEx — all used different label formats. You'd have to check each one differently. The envelope pattern is like standardizing all labels.

---

### 2. Command Pattern

**What it is:** Each executable action is encapsulated in its own object with a uniform interface. Instead of one giant function with a switch statement, each operation is its own module.

**Where it's used:** `src/lib/operations/commands/`

```typescript
// The interface (base.ts)
export type OperationCommand = {
  key: string;
  dryRun: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  execute: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

// One implementation (customer-suspend.ts)
export const customer_suspend: OperationCommand = {
  key: "customer.suspend",
  dryRun: async (payload) => ({ mode: "dry-run", payload, message: "..." }),
  execute: async (payload) => ({ mode: "execute", payload, message: "..." }),
};
```

**Why it matters:** Adding a new operation means creating a new file that follows the interface. You never touch the execution engine. This is the Open/Closed Principle: open for extension, closed for modification.

**Anti-pattern it avoids:**
```typescript
// BAD: Giant switch statement that grows forever
function executeOperation(command: string, payload: any) {
  switch (command) {
    case "customer.suspend": return suspendCustomer(payload);
    case "customer.delete": return deleteCustomer(payload);
    case "billing.refund": return processRefund(payload);
    // ... 50 more cases
  }
}
```

---

### 3. Registry Pattern

**What it is:** A central `Map` where modules register themselves by key. Code that needs a module looks it up by key rather than importing it directly.

**Where it's used:** `src/lib/operations/commands/registry.ts`

```typescript
const registry = new Map<string, OperationCommand>();

export function registerCommand(command: OperationCommand) {
  registry.set(command.key, command);
}

export function getCommand(key: string) {
  return registry.get(key);
}
```

**Why it matters:** The execution engine doesn't need to know about every command. It just asks the registry: "give me the command for key X." Commands register themselves. This decoupling means you can add/remove commands without touching the engine.

**Real-world comparison:** A phone book. You don't need to memorize everyone's number; you look it up by name.

---

### 4. Guard Clause / Early Return

**What it is:** Check for error conditions first and return early, keeping the "happy path" at the lowest indentation level.

**Where it's used:** Throughout API routes and middleware

```typescript
// From src/lib/auth/middleware.ts
export async function requirePermission(permission: PermissionKey) {
  const session = await auth();

  if (!session?.user?.role) {
    return { allowed: false, reason: "UNAUTHORIZED" } as const;  // Guard clause
  }

  const allowed = hasPermission(session.user.role as Role, permission);
  return { allowed, reason: allowed ? null : "FORBIDDEN", session } as const;
}
```

**Why it matters:** Without guard clauses, you get the "pyramid of doom" — deeply nested if/else blocks that are hard to read.

**Anti-pattern it avoids:**
```typescript
// BAD: Deeply nested
if (session) {
  if (session.user) {
    if (session.user.role) {
      const allowed = hasPermission(session.user.role, permission);
      if (allowed) {
        return { allowed: true, session };
      } else {
        return { allowed: false, reason: "FORBIDDEN" };
      }
    } else {
      return { allowed: false, reason: "UNAUTHORIZED" };
    }
  }
}
```

---

### 5. Domain-Driven Folder Structure

**What it is:** Organizing code by business domain (auth, operations, incidents) rather than by technical layer (controllers, services, models).

**Where it's used:** The entire `src/lib/` directory

```
src/lib/
  auth/           ← Everything about authentication
  operations/     ← Everything about executing operations
  incidents/      ← Everything about incident management
  feature-flags/  ← Everything about feature flags
  approvals/      ← Everything about approval workflows
```

**Why it matters:** When you're working on "incidents," every file you need is in one folder. You don't have to jump between `controllers/incidentController.ts`, `services/incidentService.ts`, `models/incident.ts`, etc.

**Trade-off:** This works great when domains are cleanly separated. It gets messy when domains overlap heavily (e.g., operations that need approvals that need incidents).

---

### 6. Route Groups for Layout Organization

**What it is:** Using Next.js route groups `(parentheses)` to apply different layouts to different sections without affecting URLs.

**Where it's used:** `src/app/(auth)/` and `src/app/(app)/`

```
src/app/
  (auth)/         ← No sidebar, no header. Just the login form.
    login/page.tsx
  (app)/          ← Full app shell: sidebar + header + content
    layout.tsx    ← Applies sidebar/header to ALL nested pages
    dashboard/page.tsx
    customers/page.tsx
```

**Why it matters:** The login page and the dashboard need completely different layouts. Route groups let you separate them cleanly. `/login` uses the auth layout; `/dashboard` uses the app layout.

---

### 7. Validated Boundaries (Zod at the Edge)

**What it is:** Validating all external input (user input, query parameters, request bodies) at the point where it enters the system, using Zod schemas.

**Where it's used:** API routes

```typescript
// From src/app/api/customers/route.ts
const querySchema = z.object({
  search: z.string().optional(),
  plan: z.enum(["free", "starter", "business", "enterprise"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// At the boundary
const parseResult = querySchema.safeParse(rawInput);
if (!parseResult.success) {
  return NextResponse.json(fail("VALIDATION_ERROR", parseResult.error.message), { status: 400 });
}
// After this point, `parseResult.data` is guaranteed to be the right shape
```

**Why it matters:** Once you've validated at the boundary, all internal code can trust the data. No more checking "is limit a number? is it positive?" deep inside business logic.

---

### 8. Server-Only Import Guard

**What it is:** Using the `"server-only"` package to cause build errors if server-side code is accidentally imported into client components.

**Where it's used:** `src/lib/db/index.ts`

```typescript
import "server-only";
// If a "use client" component tries to import this file → BUILD ERROR
```

**Why it matters:** Database credentials, API keys, and connection pools should NEVER reach the browser. This import acts as a tripwire that catches the mistake at build time, not in production.

---

### 9. Producer-Consumer (Job Queue)

**What it is:** One process (producer) creates work items; a separate process (consumer/worker) picks them up and processes them.

**Where it's used:** `worker/index.ts` with BullMQ

```typescript
// Producer side (would be in an API route)
await operationQueue.add("customer.suspend", { customerId: "cus_001" });

// Consumer side (worker/index.ts)
new Worker("opsforge-operations", async (job) => {
  console.log(`Processing job ${job.id} (${job.name})`);
  return { processedAt: new Date().toISOString() };
}, { connection: redisConnection });
```

**Why it matters:** Long-running operations (suspending 1000 accounts, exporting data) would time out if done during the web request. The queue lets the web server respond instantly with "queued" while the worker handles the heavy lifting.

---

### 10. Composite Key / Many-to-Many Join Table

**What it is:** A table with a primary key made of two columns. Used to model many-to-many relationships.

**Where it's used:** `role_permissions` table in `src/lib/db/schema.ts`

```typescript
export const rolePermissions = pgTable(
  "role_permissions",
  {
    role: roleEnum("role").notNull(),
    permissionId: uuid("permission_id").notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.role, table.permissionId] }),
  }),
);
```

**Why it matters:** A role can have many permissions, and a permission can belong to many roles. The join table expresses this relationship without duplicating data.

---

## Anti-Patterns to Watch For

### 1. Hardcoded Demo Credentials (Present in This Codebase)

```typescript
// From src/lib/auth/operators.ts
export const DEFAULT_OPERATOR_PASSWORD = "password123";
```

**Why it's here:** This is demo/scaffolding code. It's the fastest way to get authentication working for development.

**Why it's an anti-pattern:** In production, passwords should be hashed and stored in a database, never in source code. Anyone who reads the code (or the git history) knows the password.

**What better looks like:**
```typescript
// Hash passwords with bcrypt
import bcrypt from "bcrypt";
const isValid = await bcrypt.compare(inputPassword, storedHashedPassword);
```

---

### 2. Mutating Mock Data (Present in This Codebase)

```typescript
// From src/app/api/customers/[id]/route.ts
Object.assign(customer, parseResult.data);  // Mutates the mock object in memory
```

**Why it's here:** With mock data, there's no database to update. `Object.assign` is a quick hack to simulate updates.

**Why it's an anti-pattern:** This mutation only lasts until the server restarts. It also means different requests can see different data depending on order (race conditions). In-memory mutations are never safe for real production data.

**What better looks like:**
```typescript
// Use the database
await db.update(customers).set(parseResult.data).where(eq(customers.id, params.id));
```

---

### 3. Type Assertions Instead of Type Guards (Occasionally Present)

```typescript
// From src/lib/auth/config.ts
token.role = (user as { role?: string }).role;
```

**Why it's here:** NextAuth's built-in `User` type doesn't include `role`. The assertion works around it.

**Why it's an anti-pattern:** `as` tells TypeScript "shut up, I know what I'm doing." If you're wrong, you get a runtime error that TypeScript can't catch.

**What better looks like:**
```typescript
// Type guard — validates at runtime AND narrows the type
function hasRole(user: unknown): user is { role: string } {
  return typeof user === "object" && user !== null && "role" in user;
}
if (hasRole(user)) {
  token.role = user.role;  // TypeScript knows this is safe
}
```

---

### 4. Missing Error Handling on JSON Parsing (Partially Addressed)

```typescript
// From src/app/api/customers/[id]/route.ts
const body = await req.json().catch(() => null);
```

**The good:** The `.catch(() => null)` prevents a crash if the body isn't valid JSON.

**The not-great:** Returning `null` silently swallows the error. The Zod validation below will catch it, but the actual error (malformed JSON) gets masked as a "validation error."

**What better looks like:**
```typescript
let body;
try {
  body = await req.json();
} catch {
  return NextResponse.json(fail("INVALID_JSON", "Request body is not valid JSON."), { status: 400 });
}
```

---

### 5. No Input Sanitization (Not Yet an Issue, But Worth Noting)

The mock data approach means user input doesn't reach a database. But when real database queries are implemented, the project will need to ensure:
- SQL injection prevention (Drizzle ORM's parameterized queries handle this)
- XSS prevention in rendered content
- Proper escaping of user-provided strings

**Drizzle protects you by default:**
```typescript
// Drizzle parameterizes this automatically — no SQL injection possible
await db.select().from(customers).where(eq(customers.status, userInput));
```

---

## Patterns This Project Does Well

1. **Consistent file structure**: Every domain module follows the same pattern (service, policies/rules, helpers). Predictable = maintainable.

2. **Type-safe from top to bottom**: TypeScript strict mode, Drizzle typed queries, Zod runtime validation. Three layers of type safety.

3. **Separation of concerns**: Routes don't contain business logic. Business logic doesn't know about HTTP. The data layer doesn't know about either.

4. **Progressive enhancement**: The scaffolding approach means the architecture is sound even though implementation is incomplete. Adding features means filling in blanks, not rewriting structure.

5. **Explicit over implicit**: The `satisfies` keyword, `as const` assertions, and strict null checks all force the developer to be explicit about their intentions. This catches bugs early.
