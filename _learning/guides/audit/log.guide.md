# Guide: Audit Log

**File:** `src/lib/audit/log.ts`

## Purpose

An audit log records *who* did *what* to *which resource* and *when*. It is the security camera of your application.

Every significant action in the system -- creating an incident, executing a runbook, toggling a feature flag, suspending a customer -- should write an audit log entry. When something goes wrong (or when a compliance auditor asks questions), the audit log tells the story of what happened.

This file defines the shape of an audit log entry and provides a function to record one. The current implementation only logs to the console in development, but the type definitions reveal what a production audit system would capture.

## The Code

```typescript
type DangerLevel = "safe" | "moderate" | "dangerous" | "critical";

export type AuditLogInput = {
  operatorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceLabel?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  dangerLevel?: DangerLevel;
  operationId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function auditLog(params: AuditLogInput) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[audit]", params.action, params.resourceType, params.resourceId);
  }
}
```

## Line-by-Line Walkthrough

### The DangerLevel Type

```typescript
type DangerLevel = "safe" | "moderate" | "dangerous" | "critical";
```

A union type representing how risky an operation is. This is not exported (no `export` keyword), meaning it is only used within this file. The levels form a scale:

- `"safe"` -- read-only operations, viewing data.
- `"moderate"` -- modifications that can be easily reversed.
- `"dangerous"` -- significant changes that are hard to undo.
- `"critical"` -- destructive or irreversible operations.

This classification helps security teams filter and prioritize audit log reviews. You probably do not need to review every "safe" log entry, but every "critical" one deserves scrutiny.

### The AuditLogInput Type

```typescript
export type AuditLogInput = {
```

This type is exported because other files need it to construct audit log entries. Let's go through each field:

**Required fields:**

- `operatorId: string` -- Who performed the action. Usually a user ID. This is the most important field -- you need to know *who* did it.
- `action: string` -- What they did: `"create"`, `"delete"`, `"update"`, `"execute"`, etc.
- `resourceType: string` -- What kind of thing was affected: `"incident"`, `"runbook"`, `"feature-flag"`, `"customer"`.
- `resourceId: string` -- Which specific instance: `"inc_12345"`, `"rb_001"`.

**Optional fields (marked with `?`):**

- `resourceLabel?: string` -- A human-readable name for the resource. IDs are useful for machines, but humans want to see "Acme Corp" instead of "cust_a1b2c3".
- `oldValue?: Record<string, unknown>` -- The state before the change. If you updated a customer's plan from "starter" to "enterprise," `oldValue` would be `{ plan: "starter" }`.
- `newValue?: Record<string, unknown>` -- The state after the change. Paired with `oldValue`, these two fields let you see exactly what changed (a "diff").
- `dangerLevel?: DangerLevel` -- How risky this operation is. Optional because not every caller may know or care.
- `operationId?: string` -- Links this log entry to a broader operation. If a single "region failover" operation generates 50 individual actions, they all share the same `operationId`.
- `metadata?: Record<string, unknown>` -- A catch-all for any additional data that does not fit the other fields. The `Record<string, unknown>` type means "an object with string keys and values of any type."
- `requestId?: string` -- Ties the audit entry to a specific HTTP request. Useful for tracing.
- `ipAddress?: string` -- Where the request came from. Important for security (detecting unauthorized access from unusual locations).
- `userAgent?: string` -- What browser or tool was used. Helps distinguish between UI actions and API calls.

### The `Record<string, unknown>` Type

This appears three times in the type. `Record<string, unknown>` means "an object where the keys are strings and the values can be anything." The `unknown` type is safer than `any` because it forces you to check the type before using the value. It is the right choice for flexible data structures like metadata.

### The Function

```typescript
export async function auditLog(params: AuditLogInput) {
```

Takes a single parameter object instead of many individual parameters. This is the **options object pattern** -- when a function has more than 3-4 parameters, especially when many are optional, it is cleaner to pass a single object. Callers can include only the fields they need.

```typescript
  if (process.env.NODE_ENV !== "production") {
    console.log("[audit]", params.action, params.resourceType, params.resourceId);
  }
```

This only logs during development. `process.env.NODE_ENV` is an environment variable that Node.js applications use to distinguish between environments:
- `"development"` -- local development
- `"test"` -- running tests
- `"production"` -- live, customer-facing

The condition `!== "production"` means "log in development and test, but not in production." In production, you would send audit logs to a proper storage system (database, log aggregation service, etc.) instead of `console.log`.

The `[audit]` prefix in the log message is a convention that makes it easy to filter audit logs in a sea of other console output. You can search for `[audit]` to find just these messages.

Notice the function logs only 3 of the 13 possible fields. This is intentional for the console -- you want a concise summary, not a wall of text. The full data would be sent to a proper audit store in production.

### Why the Function Body is Almost Empty

The function accepts a rich input type but does almost nothing with it. This is the most important design aspect: the *type* defines the contract. Even though the implementation is a stub, every caller is already structuring their data according to `AuditLogInput`. When the real implementation arrives, all callers are already passing the right data.

## Honesty About Code Quality

- **The implementation is a stub.** Production audit logging would write to an append-only database (like a write-ahead log or immutable ledger), not `console.log`.
- **No timestamps.** The function does not record when the action happened. A real implementation would add `timestamp: new Date().toISOString()` automatically.
- **`action` and `resourceType` are `string`, not unions.** This means callers can pass any string, including typos: `"delet"` instead of `"delete"`. Union types or enums would prevent this.
- **The `DangerLevel` type is not exported.** If a caller wants to use it for type safety (e.g., in their function that computes danger levels), they cannot import it.
- **No batching.** High-throughput systems might generate thousands of audit log entries per second. Writing each one individually is expensive. Batching (collecting entries and writing them together) is a common optimization.
- **The `if` check means production gets zero audit logging.** The stub literally does nothing in production. This is a significant gap that should be flagged clearly.

The type definition, however, is solid. It captures the right information and uses appropriate TypeScript features (optional fields, `Record<string, unknown>`, union types).

## Concepts Taught

1. **The options object pattern** -- Instead of `auditLog(operatorId, action, resourceType, resourceId, ...)` with 13 parameters, the function takes a single object. This is more readable at call sites, supports optional parameters naturally, and is self-documenting because each field has a name.

2. **`Record<string, unknown>` vs `any`** -- Both represent "I don't know the exact shape." But `unknown` is safe: TypeScript forces you to check the type before using the value. `any` is unsafe: TypeScript lets you do anything without checks. Prefer `unknown` for data with unpredictable shapes.

3. **Environment-based behavior** -- Using `process.env.NODE_ENV` to change behavior between development and production. This is one of the most common patterns in server-side JavaScript. Logging, error detail, mock data, and feature gates often depend on the environment.

4. **Types as documentation** -- Even when the implementation is a stub, the type definition documents what the system *intends to capture*. Someone reading `AuditLogInput` immediately understands the system's auditing capabilities and requirements, without looking at any other code.

5. **Required vs optional fields** -- The four required fields (operatorId, action, resourceType, resourceId) represent the minimum viable audit entry: who, what, what kind, which one. Everything else adds useful context but is not strictly necessary.

## Common Mistakes

1. **Not logging enough context** -- It is easy to log `"user deleted a thing"` and call it done. But when you need to investigate months later, you want to know: which user? Which thing? What was the thing's state before deletion? What IP address? Always log more context than you think you need.

2. **Logging sensitive data** -- Audit logs might include customer data, and that data might include PII (personally identifiable information), passwords, or API keys. Be careful about what goes into `oldValue`, `newValue`, and `metadata`. You may need to redact sensitive fields.

3. **Making audit logging synchronous and blocking** -- If audit logging slows down your main operation (because it is waiting for a database write), users will suffer. Audit logging should be async and non-blocking. If the audit write fails, the main operation should still succeed (log the failure separately).

4. **Forgetting to add audit logging to new features** -- It is the kind of thing that is easy to skip when you are focused on building the feature. Code reviews should check: "Does this feature have audit logging for significant actions?"

5. **Using `any` instead of `unknown`** -- `Record<string, any>` would also work here, but it sacrifices type safety. With `any`, you can accidentally access `metadata.foo.bar.baz` without TypeScript complaining, even if those properties do not exist.

## Mini Exercises

### Exercise 1: Add a Timestamp
Modify the function to automatically add a `timestamp` field (ISO string) to the log output. The caller should not have to provide it -- the function generates it internally. Think about where this timestamp should be added: to the console output, or to a new enriched object?

<details>
<summary>Hint</summary>

```typescript
export async function auditLog(params: AuditLogInput) {
  const entry = {
    ...params,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[audit]", entry.timestamp, entry.action, entry.resourceType, entry.resourceId);
  }
}
```

The `...params` spread operator copies all fields from the input into the new object.
</details>

### Exercise 2: Export and Use DangerLevel
Export the `DangerLevel` type and write a function `getDangerLevel(action: string): DangerLevel` that maps common actions to danger levels. For example, `"read"` is `"safe"`, `"delete"` is `"critical"`.

<details>
<summary>Hint</summary>

```typescript
export type DangerLevel = "safe" | "moderate" | "dangerous" | "critical";

export function getDangerLevel(action: string): DangerLevel {
  if (action === "delete" || action === "suspend") return "critical";
  if (action === "update" || action === "execute") return "dangerous";
  if (action === "create") return "moderate";
  return "safe";
}
```

</details>

### Exercise 3: Build a Type-Safe Caller
Write a function `auditFeatureFlagToggle(operatorId: string, flagKey: string, oldEnabled: boolean, newEnabled: boolean)` that calls `auditLog` with properly filled-in fields. This demonstrates how feature-specific code wraps the generic audit function.

<details>
<summary>Hint</summary>

```typescript
async function auditFeatureFlagToggle(
  operatorId: string,
  flagKey: string,
  oldEnabled: boolean,
  newEnabled: boolean
) {
  await auditLog({
    operatorId,
    action: newEnabled ? "enable" : "disable",
    resourceType: "feature-flag",
    resourceId: flagKey,
    oldValue: { isEnabled: oldEnabled },
    newValue: { isEnabled: newEnabled },
    dangerLevel: "moderate",
  });
}
```

This wrapper provides a type-safe, domain-specific interface while delegating to the generic audit system.
</details>

## Further Reading

- **Audit logging best practices** -- OWASP has guidelines on what to log for security purposes. Search for "OWASP logging cheat sheet."
- **Append-only data structures** -- Audit logs should be immutable. Once written, entries should never be modified or deleted. Look into append-only databases and event sourcing.
- **The `unknown` type in TypeScript** -- TypeScript 3.0 introduced `unknown` as a type-safe alternative to `any`. The TypeScript handbook explains when and why to use it.
- **Structured logging** -- Instead of `console.log` with string concatenation, structured logging outputs JSON objects. Tools like Pino and Winston support this. Structured logs are much easier to search, filter, and analyze.
- **GDPR and data privacy** -- Audit logs that contain personal data are subject to data protection regulations. Understand the implications before logging customer information.
