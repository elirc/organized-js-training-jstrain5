# Guide: Dry-Run Simulation

**File:** `src/lib/operations/dry-run.ts`

## Purpose

This file provides a way to **simulate** an operation before actually running it. The idea is simple: before you delete a customer, rotate an API key, or issue a bulk credit, you want to know what *would* happen -- without anything actually happening. Are there blockers? Warnings? How many records will be affected?

This is the same concept as:
- Running `terraform plan` before `terraform apply`
- Using `git diff --stat` before committing
- Previewing a mail merge before sending

The dry-run module sits between the caller and the command. It takes a command key and a list of target IDs, simulates the operation, and returns a report of what would happen.

## The Code

```typescript
export async function simulateOperation(command: string, targetIds: string[]) {
  return {
    command,
    targetCount: targetIds.length,
    blockers: [],
    warnings: [],
  };
}
```

## Line-by-Line Walkthrough

### `export async function simulateOperation(command: string, targetIds: string[]) {`

- `export` -- this is a public function, available to other modules.
- `async` -- marked async for the same forward-thinking reason as the engine. The real implementation will make database queries and call command-level `dryRun` methods.
- `simulateOperation` -- the name uses "simulate," not "dryRun." This is a deliberate naming choice. The individual commands have a `dryRun` method. This module-level function is a higher-level **simulation** that might call multiple commands' `dryRun` methods, aggregate results across targets, and add system-level checks on top.
- `command: string` -- the dot-notation command key, like `"customer.plan.change"`.
- `targetIds: string[]` -- an array of entity IDs that the operation would target. This is an important design detail: the system supports **batch operations**. You can simulate deleting one customer or a thousand in a single call.

### `return {`

Returns a simulation report. Let's look at each property.

### `command,`

Echoes back the command key. This is useful when the caller is simulating multiple commands and needs to match results to requests.

### `targetCount: targetIds.length,`

The number of targets. Right now this is just `targetIds.length`, which is trivially obvious. But in a real implementation, `targetCount` might differ from `targetIds.length`. Why? Because some targets might be filtered out (already deleted, wrong status, insufficient permissions). So the report might say "you asked about 100 targets, but only 87 are eligible."

### `blockers: [],`

An empty array. **Blockers** are conditions that **prevent** the operation from proceeding. If there are any blockers, the operation should not be allowed to execute.

Examples of real blockers:
- "Customer #123 has a pending legal hold -- cannot delete"
- "Invoice #456 has already been voided"
- "API key rotation is disabled during maintenance window"
- "Target region is currently in failover mode"

The type is inferred as `never[]` (an empty array with no type annotation). In the real implementation, you would type this as `string[]` or, better, an array of structured objects:

```typescript
type Blocker = {
  targetId: string;
  reason: string;
  code: string;
};
```

### `warnings: [],`

An empty array. **Warnings** are conditions that the operator should know about but that do not prevent execution. The operation can proceed, but the operator should review the warnings first.

Examples of real warnings:
- "Customer #789 has 3 unpaid invoices -- plan change will not affect them"
- "Refund amount is unusually large (top 1% of refunds)"
- "This feature flag is currently referenced by 4 active A/B tests"

The distinction between blockers and warnings is a core UX pattern in operations tooling. Blockers are hard stops. Warnings are "proceed with caution."

## Concepts Taught

### 1. The Simulation / Preview Pattern

Simulations give operators confidence. Instead of clicking "delete" and hoping for the best, they click "simulate," review the report, and then decide whether to proceed. This pattern is essential for any system where mistakes are expensive or hard to reverse.

A good simulation report answers three questions:
1. **What will happen?** (target count, affected resources)
2. **What could go wrong?** (blockers)
3. **What should I be careful about?** (warnings)

### 2. Batch Operations

The function takes `targetIds: string[]` -- an array, not a single ID. This signals that the system is designed for bulk operations. In an admin panel, you might select 50 customers and simulate suspending all of them at once. The simulation would check each one individually and aggregate the results.

A real implementation might look like:

```typescript
export async function simulateOperation(command: string, targetIds: string[]) {
  const cmd = getCommand(command);
  if (!cmd) {
    return { command, targetCount: 0, blockers: ["Unknown command"], warnings: [] };
  }

  const blockers: Blocker[] = [];
  const warnings: Warning[] = [];

  for (const id of targetIds) {
    const result = await cmd.dryRun({ targetId: id });
    if (result.blockers) blockers.push(...result.blockers);
    if (result.warnings) warnings.push(...result.warnings);
  }

  return {
    command,
    targetCount: targetIds.length,
    eligibleCount: targetIds.length - blockers.length,
    blockers,
    warnings,
  };
}
```

### 3. Blockers vs Warnings

This is a pattern borrowed from CI/CD and deployment systems:

- **Blocker:** Hard stop. The system should refuse to proceed. The UI should show a red indicator and disable the "Execute" button.
- **Warning:** Soft signal. The system allows proceeding, but the operator should acknowledge the warnings. The UI might show a yellow indicator and require a confirmation step.

Some systems add a third level: **info** -- purely informational notes that do not require any action.

### 4. Type Inference and Empty Arrays

When you write `blockers: []`, TypeScript infers the type as `never[]` -- an array that can never contain any elements. This is technically correct for an empty literal, but it is not very useful. If someone tries to push a string into `blockers`, they will get a type error. In the real implementation, you should annotate the type:

```typescript
blockers: [] as string[],
// or
blockers: new Array<string>(),
```

This is a subtle gotcha with TypeScript inference on empty arrays.

### 5. Separation from Individual Command dryRun

Notice that this module-level `simulateOperation` is **separate** from the `dryRun` method on each command. They serve different roles:

- `command.dryRun(payload)` -- simulates a single command for a single target with specific payload data
- `simulateOperation(command, targetIds)` -- orchestrates simulation across multiple targets, adds system-level checks, and aggregates results

The engine might call `simulateOperation` first (to give the operator a preview), and then call `command.execute` for each target when the operator confirms.

## Common Mistakes

### 1. Confusing blockers and warnings

A blocker is "this cannot happen." A warning is "this can happen but you should be aware." Misclassifying a blocker as a warning (or vice versa) can lead to operators running operations that should have been stopped, or being unable to run operations that are actually safe.

### 2. Not simulating per-target

If you have 100 targets, you need to check each one. A simulation that only checks the first target (or checks global conditions but not per-target conditions) can give a misleading green light. Target #57 might have a legal hold that targets #1-56 do not.

### 3. Simulation that mutates state

A dry-run must **never** change anything. No database writes, no queue publishes, no side effects. If your simulation function accidentally writes to the database, it is not a simulation -- it is an execution disguised as one. This is sometimes called the "observation problem" -- the act of observing should not change the thing being observed.

### 4. Empty arrays hiding type issues

As mentioned in the concepts section, `blockers: []` infers as `never[]`. If you later try to do `result.blockers.push("something")`, TypeScript will complain. Always type your empty arrays explicitly when they will eventually hold values.

## Mini Exercises

### Exercise 1: Add an Eligibility Count

Modify the function to accept a third parameter, `options: { maxTargets?: number }`. If `targetIds.length` exceeds `maxTargets`, add a blocker string like `"Target count (150) exceeds maximum (100)"`. Return an `eligibleCount` that is `Math.min(targetIds.length, maxTargets)`.

<details>
<summary>Hint</summary>

```typescript
export async function simulateOperation(
  command: string,
  targetIds: string[],
  options: { maxTargets?: number } = {}
) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (options.maxTargets && targetIds.length > options.maxTargets) {
    blockers.push(
      `Target count (${targetIds.length}) exceeds maximum (${options.maxTargets})`
    );
  }

  return {
    command,
    targetCount: targetIds.length,
    eligibleCount: options.maxTargets
      ? Math.min(targetIds.length, options.maxTargets)
      : targetIds.length,
    blockers,
    warnings,
  };
}
```
</details>

### Exercise 2: Aggregate Per-Target Results

Write a version of `simulateOperation` that loops through `targetIds`, calls an imaginary `checkTarget(command, id)` function for each one, and collects blockers and warnings. `checkTarget` returns `{ eligible: boolean, reason?: string }`. If `eligible` is false, add the reason to blockers.

### Exercise 3: Add Timing Information

Modify the function to measure how long the simulation takes (use `Date.now()` or `performance.now()`) and include `durationMs` in the return value. Why is this useful? Think about simulations that check thousands of targets -- operators want to know if the simulation itself is going to take 2 seconds or 2 minutes.

<details>
<summary>Hint</summary>

```typescript
export async function simulateOperation(command: string, targetIds: string[]) {
  const start = Date.now();

  // ... simulation logic ...

  return {
    command,
    targetCount: targetIds.length,
    blockers: [] as string[],
    warnings: [] as string[],
    durationMs: Date.now() - start,
  };
}
```
</details>

## Further Reading

- **Terraform Plan:** The canonical example of "simulate before you apply" in infrastructure tooling.
- **Optimistic vs Pessimistic Concurrency:** How simulation interacts with concurrent changes -- what if the data changes between simulation and execution?
- **Idempotency:** If you simulate twice, you should get the same result. This is related to the idea that simulations must not mutate state.
- **Batch processing patterns:** How to efficiently process thousands of targets with error handling, retries, and progress reporting.
- **The "preview" pattern in UIs:** How admin dashboards show simulation results before confirming destructive actions.
