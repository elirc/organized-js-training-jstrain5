# Guide: Operation Engine

**File:** `src/lib/operations/engine.ts`

## Purpose

The engine is the **orchestrator** of the operations system. When someone says "run this command," the engine is the function that coordinates it. In its current state, it is a minimal stub -- it accepts an operation ID and returns a "queued" status. But the name and position of this file tell you what it is meant to become: the central execution pipeline that ties together validation, rate limiting, dry-runs, execution, auditing, and rollback.

Think of it like a car engine block with no pistons yet. The block is in the right place, it has the right shape, and everything else is designed to bolt onto it. The moving parts come later.

## The Code

```typescript
export async function executeOperation(operationId: string) {
  return { operationId, status: "queued" as const };
}
```

That is the whole file. One function, three lines. Let's unpack what each piece means and what it is going to become.

## Line-by-Line Walkthrough

### `export async function executeOperation(operationId: string) {`

- `export` -- this function is the public API of the engine module. Other parts of the system (API routes, background workers, the UI) will call this.
- `async` -- the function is async even though it does nothing asynchronous right now. This is forward-thinking. The real implementation will make database calls, publish to queues, and call other async functions. By declaring it async from the start, all callers are already written to handle a Promise.
- `executeOperation` -- the name is clear and intentional. Not `runCommand` or `doOperation`. The word "execute" matches the `execute` method on `OperationCommand`, creating a consistent vocabulary across the codebase.
- `operationId: string` -- the function takes an operation ID, not a command key or a payload. This suggests a design where operations are **created first** (stored in a database with an ID, a command key, a payload, and a status) and then **executed by ID**. This is a common pattern in systems that need audit trails and retry logic -- you create a record, then process it.

### `return { operationId, status: "queued" as const };`

This returns a plain object with two properties:

- `operationId` -- echoed back so the caller can confirm which operation was processed.
- `status: "queued" as const` -- this is the interesting part. Let's talk about `as const`.

#### What `as const` Does Here

Without `as const`, TypeScript would infer the type of `status` as `string`. With `as const`, it infers the type as the **literal** `"queued"`. The difference matters:

```typescript
// Without as const
const result = { status: "queued" };
// TypeScript sees: { status: string }
// result.status could be any string as far as the type system knows

// With as const
const result = { status: "queued" as const };
// TypeScript sees: { status: "queued" }
// result.status can ONLY be "queued" -- the type is the exact literal
```

This is useful when you build discriminated unions. Imagine the engine eventually returns different shapes for different statuses:

```typescript
type EngineResult =
  | { operationId: string; status: "queued" }
  | { operationId: string; status: "failed"; error: string }
  | { operationId: string; status: "completed"; result: unknown };
```

With `as const`, the returned object automatically matches the `"queued"` variant. Without it, TypeScript cannot narrow the type.

## What This Function Will Become

The stub is simple, but the real engine would orchestrate a multi-step pipeline. Here is a sketch of what a production version might look like:

```typescript
export async function executeOperation(operationId: string) {
  // 1. Load the operation record from the database
  const operation = await db.operations.findById(operationId);
  if (!operation) {
    return { operationId, status: "failed" as const, error: "Operation not found" };
  }

  // 2. Check rate limits
  const rateCheck = await checkRateLimit(operation.operatorId, operation.command);
  if (!rateCheck.allowed) {
    return { operationId, status: "rate_limited" as const, retryAfter: rateCheck.retryAfter };
  }

  // 3. Validate inputs
  const validation = await validateOperationInputs(operation.command, operation.payload);
  if (!validation.valid) {
    return { operationId, status: "invalid" as const, blockers: validation.blockers };
  }

  // 4. Look up the command
  const command = getCommand(operation.command);
  if (!command) {
    return { operationId, status: "failed" as const, error: `Unknown command: ${operation.command}` };
  }

  // 5. Run dry-run first (if the operation hasn't been pre-simulated)
  if (!operation.dryRunCompleted) {
    const simulation = await command.dryRun(operation.payload);
    await db.operations.update(operationId, { dryRunResult: simulation, dryRunCompleted: true });
  }

  // 6. Execute the command
  try {
    const result = await command.execute(operation.payload);
    await db.operations.update(operationId, { status: "completed", result });
    await auditLog.record({ operationId, action: operation.command, status: "completed" });
    return { operationId, status: "completed" as const, result };
  } catch (error) {
    await db.operations.update(operationId, { status: "failed", error: String(error) });
    await auditLog.record({ operationId, action: operation.command, status: "failed" });
    return { operationId, status: "failed" as const, error: String(error) };
  }
}
```

Notice how the engine does not know what any specific command does. It does not know about customers, billing, or infrastructure. It just coordinates the pipeline. Each step (rate limiting, validation, command lookup, execution, auditing) is delegated to a specialized module. This is the **single responsibility principle** in action.

## Concepts Taught

### 1. `as const` for Literal Types

`as const` is a TypeScript assertion that tells the compiler "treat this value as its most specific type." For strings, that means the literal value instead of `string`. For arrays, it means a readonly tuple. For objects, it means all properties are readonly with literal types.

```typescript
const a = "hello";           // Type: string
const b = "hello" as const;  // Type: "hello"

const c = [1, 2, 3];             // Type: number[]
const d = [1, 2, 3] as const;    // Type: readonly [1, 2, 3]
```

This is a zero-cost operation -- it produces no runtime code. It only affects how TypeScript reasons about the type.

### 2. Orchestration Functions

An orchestration function (sometimes called a "coordinator" or "pipeline") calls other functions in a specific order, handles errors, and returns a unified result. The engine is this system's orchestrator. Orchestrators should contain **flow logic** (what to do and in what order) but not **business logic** (how to do each step). That keeps them easy to understand and test.

### 3. ID-Based Execution

The function takes an `operationId`, not raw command data. This implies that operations are first-class entities with their own lifecycle:

1. **Created** -- an operation record is stored with a unique ID
2. **Validated** -- inputs are checked
3. **Simulated** -- dry-run is performed
4. **Executed** -- the real work happens
5. **Completed** or **Failed** -- terminal states
6. Possibly **Rolled back**

This is similar to how job queues (Sidekiq, Bull, Celery) work -- you enqueue a job by ID and a worker picks it up later.

### 4. Async Stubs

Making a stub `async` when it does not need to be is a deliberate choice. The alternative -- making it synchronous now and converting later -- would force you to update every call site when you add real async logic. "Make it async from the start" is a pragmatic convention for functions that you know will eventually do I/O.

## Common Mistakes

### 1. Forgetting `as const`

If you write `{ status: "queued" }` without `as const`, TypeScript infers `{ status: string }`. This means you cannot use the status in a type-narrowing `switch` or `if` statement without extra type guards. It is a subtle issue that manifests later when you try to build discriminated unions.

### 2. Calling the engine before creating the operation record

If the design expects operations to be stored in a database before `executeOperation` is called, calling it with a random string that is not in the database will fail. The stub does not show this because it does not look anything up, but the real version would.

### 3. Not handling errors from the pipeline steps

In the real version, every step can fail. If you forget a try/catch around `command.execute()`, an unhandled error could crash the process. Always think about what happens when each step fails, not just when it succeeds.

### 4. Putting business logic in the engine

The engine should not know what "changing a customer plan" means. It should know how to look up a command, run its `dryRun`, run its `execute`, and record the result. If you start adding `if (command === "customer.plan.change") { ... }` inside the engine, you are breaking the abstraction. That logic belongs in the command itself.

## Mini Exercises

### Exercise 1: Add Status Types

Define a TypeScript type `OperationStatus` that represents all possible statuses an operation can have: `"queued"`, `"running"`, `"completed"`, `"failed"`, `"rolled_back"`, and `"rate_limited"`. Then define an `OperationResult` type where each status has different additional properties (e.g., `"failed"` includes an `error` string, `"completed"` includes a `result` object).

<details>
<summary>Hint</summary>

```typescript
type OperationResult =
  | { operationId: string; status: "queued" }
  | { operationId: string; status: "running" }
  | { operationId: string; status: "completed"; result: Record<string, unknown> }
  | { operationId: string; status: "failed"; error: string }
  | { operationId: string; status: "rolled_back" }
  | { operationId: string; status: "rate_limited"; retryAfter: number };
```

This is called a **discriminated union** -- the `status` field is the discriminant.
</details>

### Exercise 2: Write the Pipeline Skeleton

Using the sketch in the "What This Function Will Become" section as inspiration, write a version of `executeOperation` that calls (imaginary) functions in the right order. Do not implement those functions -- just call them and handle their return values. Focus on the control flow: what happens if validation fails? What if the command is not found? What if execution throws an error?

### Exercise 3: Add a Timeout

Wrap the command execution step in a timeout. If `command.execute(payload)` takes longer than 30 seconds, return a `"timed_out"` status instead. Research `Promise.race` to figure out how.

<details>
<summary>Hint</summary>

```typescript
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Operation timed out")), ms)
  );
  return Promise.race([promise, timeout]);
}

// Usage:
const result = await withTimeout(command.execute(payload), 30_000);
```
</details>

## Further Reading

- **TypeScript `as const` assertion:** The official docs on const assertions and how they affect type inference.
- **Discriminated unions in TypeScript:** How to use literal types as discriminants for type narrowing.
- **Orchestration vs Choreography:** Two approaches to coordinating multiple services or steps -- the engine uses orchestration.
- **Job queue patterns (Bull, Sidekiq, Celery):** Real-world systems that use ID-based job execution with status tracking.
- **The Pipeline pattern:** Structuring code as a series of sequential steps, each with clear inputs and outputs.
