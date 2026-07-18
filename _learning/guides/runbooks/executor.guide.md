# Guide: Runbook Executor

**File:** `src/lib/runbooks/executor.ts`

## Purpose

Creating a runbook (via the service) defines *what* needs to happen. Executing a runbook actually *does* it. This file bridges that gap.

When an operator clicks "Run" on a runbook in the UI, this function is what fires. It takes a runbook ID, kicks off the defined steps, and returns a status indicating the runbook is now running.

In a fully implemented system, executing a runbook might involve: running scripts on remote servers, calling APIs in sequence, waiting for human confirmations at certain steps, rolling back if a step fails, and recording every action in an audit log. The current scaffold just returns a "running" status.

## The Code

```typescript
export async function executeRunbook(runbookId: string) {
  return { runbookId, status: "running" as const };
}
```

## Line-by-Line Walkthrough

### `export async function executeRunbook(runbookId: string) {`

- `async` is absolutely essential here. Even this stub needs `async` because real runbook execution is one of the most inherently asynchronous operations in the system. It might take minutes or hours to complete.
- `runbookId: string` -- identifies which runbook to execute. The function would look up the runbook's steps and begin executing them.

### `return { runbookId, status: "running" as const };`

- Returns immediately with `"running"` status. In a real system, this would mean "I have started the runbook; it is now in progress." The actual execution would continue in the background.
- This is the **command acknowledgment** pattern: the function says "I received your request and started working on it" rather than "I am done." The caller would then poll for status updates or subscribe to events to track progress.

## Honesty About Code Quality

This is one of the stubs that has the largest gap between the scaffold and a real implementation:

- **No step execution.** The whole point of a runbook is its steps. This function does not look up or execute any steps.
- **No error handling.** What if the runbook ID does not exist? What if a step fails? What if the runbook is already running?
- **No progress tracking.** A real executor would update the runbook's status as it progresses through steps: "step 1 of 5 complete," "waiting for approval on step 3," etc.
- **No rollback capability.** If step 3 of 5 fails, you might need to undo steps 1 and 2. This is non-trivial and not addressed.
- **No concurrency control.** What if two people try to execute the same runbook simultaneously? You need a lock or a check to prevent this.
- **No audit trail.** Every step should be logged with who triggered it, when, and what the outcome was.

The gap is large because runbook execution is genuinely complex. The scaffold acknowledges that complexity by at least defining the entry point.

## Concepts Taught

1. **Command acknowledgment pattern** -- The function returns "running" immediately instead of waiting for the entire runbook to complete. This is how most long-running operations work in production: you submit the request, get back a reference (the `runbookId`), and check status later. APIs like AWS Step Functions, GitHub Actions, and CI/CD pipelines all work this way.

2. **Fire-and-forget vs. wait-for-completion** -- This stub returns immediately (fire-and-forget). A real implementation might return immediately but continue executing in the background (via a job queue, background worker, or separate process). The caller only gets the acknowledgment, not the final result.

3. **Long-running operations** -- Some operations take seconds, minutes, or even hours. You cannot keep an HTTP request open that long. The solution is to return an ID immediately, do the work asynchronously, and let the caller poll for status or subscribe to webhooks/events.

4. **The executor pattern** -- Separating "what to do" (the runbook definition) from "doing it" (the executor) is a common and powerful pattern. It means you can test definitions without executing them, and you can swap execution strategies without changing definitions.

## Common Mistakes

1. **Blocking on long-running operations** -- If `executeRunbook` tried to run all steps synchronously and return the final result, the HTTP request would time out. Long-running operations must be handled asynchronously.

2. **Not returning a tracking reference** -- If the function returned `{ status: "running" }` without the `runbookId`, the caller would have no way to check on progress later. Always return an identifier that the caller can use for follow-up queries.

3. **Ignoring idempotency** -- If someone accidentally calls `executeRunbook("rb_001")` twice, should it start two executions? Probably not. A real implementation should check whether the runbook is already running and reject the duplicate request.

4. **Not considering partial failure** -- Runbooks have multiple steps. If step 3 fails, steps 1 and 2 already ran. You need a strategy: retry step 3? Roll back steps 1-2? Skip step 3 and continue? Halt everything? This is one of the hardest problems in distributed systems.

## Mini Exercises

### Exercise 1: Add a Pre-execution Check
Before returning the "running" status, add a check: if `runbookId` is empty, throw an error. This is basic input validation. Think about what other checks you would want before starting a runbook.

<details>
<summary>Hint</summary>

```typescript
export async function executeRunbook(runbookId: string) {
  if (!runbookId) {
    throw new Error("runbookId is required");
  }
  return { runbookId, status: "running" as const };
}
```

Other checks to consider: does the runbook exist? Is it already running? Does the caller have permission?
</details>

### Exercise 2: Return a Richer Status Object
Expand the return object to include `startedAt` (ISO timestamp), `executionId` (a unique ID for this specific execution, since the same runbook could be run multiple times), and `steps` (an empty array that would later contain step statuses).

<details>
<summary>Hint</summary>

```typescript
return {
  executionId: `exec_${Date.now()}`,
  runbookId,
  status: "running" as const,
  startedAt: new Date().toISOString(),
  steps: [],
};
```

The `executionId` is separate from `runbookId` because one runbook can have many executions over time.
</details>

### Exercise 3: Simulate Step Execution
Write a function `simulateExecution` that takes a list of step names and "executes" them with a 100ms delay between each (using `setTimeout` wrapped in a Promise). Log each step as it "completes." This simulates what a real executor would do.

<details>
<summary>Hint</summary>

```typescript
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateExecution(steps: string[]) {
  for (const step of steps) {
    console.log(`Starting: ${step}`);
    await delay(100);
    console.log(`Completed: ${step}`);
  }
  console.log("All steps complete");
}

simulateExecution(["Check health", "Redirect traffic", "Verify failover"]);
```

</details>

## Further Reading

- **Job queues and background workers** -- Tools like BullMQ (Node.js), Celery (Python), or Sidekiq (Ruby) handle the "start now, complete later" pattern. They are essential for long-running operations.
- **Saga pattern** -- A design pattern for managing multi-step operations where each step can be compensated (rolled back). Directly relevant to runbook execution. Search for "saga pattern microservices."
- **Idempotent operations** -- Design each runbook step so that running it twice has the same effect as running it once. This makes retry logic safe.
- **AWS Step Functions** -- A managed service that orchestrates multi-step workflows. Looking at how it works (states, transitions, error handling, retries) will give you a real-world model for what a fully implemented runbook executor looks like.
