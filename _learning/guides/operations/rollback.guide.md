# Guide: Operation Rollback

**File:** `src/lib/operations/rollback.ts`

## Purpose

Rollback is the "undo" button for operations. When something goes wrong after execution -- the wrong customers were suspended, a refund was issued for the wrong amount, a feature flag broke production -- you need a way to reverse it. This file provides the entry point for that reversal.

In the real world, rollback is one of the hardest problems in software engineering. Some operations are easy to undo (toggling a feature flag back). Others are difficult (un-sending an email). Some are impossible (you cannot un-delete data that was purged from backups). The rollback module does not solve all of these problems -- but having it as a first-class concept in the system architecture means the team has committed to at least thinking about reversibility for every operation.

## The Code

```typescript
export async function rollbackOperation(operationId: string) {
  return { operationId, status: "rollback_queued" as const };
}
```

## Line-by-Line Walkthrough

### `export async function rollbackOperation(operationId: string) {`

- `export async function` -- same pattern as the engine. Public, async, ready for real implementation.
- `rollbackOperation` -- the name is symmetrical with `executeOperation` in the engine. Execute goes forward; rollback goes backward.
- `operationId: string` -- takes an operation ID, not a command or payload. This is critical. The rollback system needs to know **which specific execution** to reverse. If you ran `customer.plan.change` for customer #123 at 2:03 PM, the rollback needs to know what the plan was *before* that change. That information is stored with the operation record, referenced by this ID.

### `return { operationId, status: "rollback_queued" as const };`

- `operationId` -- echoed back for caller confirmation.
- `status: "rollback_queued" as const` -- uses the same `as const` pattern as the engine (see the engine guide for why). The status is `"rollback_queued"`, not `"rolled_back"`. The difference matters: "queued" means the rollback has been **requested** but not **completed**. Like execution, rollback is likely asynchronous -- it goes through a queue, gets validated, and then runs. You do not get an instant undo; you get a promise that the undo will happen.

## What This Function Will Become

A real rollback system is significantly more complex than the stub suggests. Here is what it might look like:

```typescript
export async function rollbackOperation(operationId: string) {
  // 1. Load the original operation
  const operation = await db.operations.findById(operationId);
  if (!operation) {
    return { operationId, status: "failed" as const, error: "Operation not found" };
  }

  // 2. Check if rollback is possible
  if (operation.status !== "completed") {
    return { operationId, status: "failed" as const, error: "Can only rollback completed operations" };
  }
  if (operation.rolledBack) {
    return { operationId, status: "failed" as const, error: "Already rolled back" };
  }

  // 3. Check if the command supports rollback
  const command = getCommand(operation.command);
  if (!command.rollback) {
    return { operationId, status: "failed" as const, error: "This command does not support rollback" };
  }

  // 4. Create a rollback operation record
  const rollbackId = generateId();
  await db.operations.create({
    id: rollbackId,
    type: "rollback",
    parentOperationId: operationId,
    command: operation.command,
    payload: operation.rollbackData,
    status: "queued",
  });

  // 5. Queue the rollback for processing
  await queue.publish("operations.rollback", { rollbackId, operationId });

  // 6. Mark the original operation as rollback-pending
  await db.operations.update(operationId, { rollbackStatus: "pending", rollbackId });

  return { operationId, rollbackId, status: "rollback_queued" as const };
}
```

Notice the key idea: the rollback is itself an operation. It has its own ID, its own record, its own status lifecycle. This means rollbacks are auditable, retryable, and can even be rolled back themselves (though that gets into recursive territory that you want to avoid).

## Concepts Taught

### 1. Reversibility as a Design Principle

Building rollback support from day one forces you to think about every operation in terms of pairs: do/undo. This has downstream effects on how you design everything else:

- **Data storage:** You need to capture the "before" state so you can restore it. This is why the operation record stores `rollbackData` -- a snapshot of what things looked like before the operation.
- **Command design:** Each command potentially needs a `rollback` method in addition to `dryRun` and `execute`.
- **Audit logging:** You need to track which operations have been rolled back, when, and by whom.

Not every operation is reversible. Deleting data from an external system, sending notifications, charging a credit card -- these may not have clean undo paths. The system should explicitly mark which commands support rollback and gracefully refuse rollback for those that do not.

### 2. The Queued Status Pattern

`"rollback_queued"` follows the same pattern as `"queued"` in the engine. Dangerous operations should not be instant. Queuing gives you:

- **A chance to cancel.** If you queue a rollback and immediately realize you were wrong, you can cancel it before the worker picks it up.
- **Retry logic.** If the rollback fails (database timeout, external service down), the queue system can retry it.
- **Rate control.** You do not want 500 rollbacks hitting the database simultaneously. A queue lets you process them at a controlled pace.
- **Audit trail.** A queued operation is a record that exists before execution begins. You can see that someone requested a rollback even if it has not happened yet.

### 3. Operation Lifecycle

The status values across the system tell a story about how operations move through states:

```
Created --> Queued --> Running --> Completed --> (optionally) Rollback Queued --> Rolled Back
                 \                      \
                  --> Failed              --> Rollback Failed
```

This is a **state machine**. Each status is a state, and there are defined transitions between them. You cannot roll back a "queued" operation (it has not done anything yet -- just cancel it). You cannot roll back a "failed" operation (it did not succeed, so there is nothing to reverse). You can only roll back a "completed" operation.

### 4. `as const` for Status Strings (Continued)

This is the third file using `as const` for status strings. The pattern should feel familiar now. The consistency across files (`"queued" as const`, `"rollback_queued" as const`) is intentional -- it builds toward a unified type system for operation statuses.

### 5. Snapshot-Based Rollback vs Compensating Actions

There are two main approaches to rollback:

- **Snapshot-based:** Before changing a customer's plan from "Basic" to "Pro," store `{ previousPlan: "Basic" }`. To rollback, set the plan back to "Basic." This requires capturing state before every change.
- **Compensating action:** Instead of restoring a snapshot, run an inverse operation. If the original operation was "add $50 credit," the compensating action is "remove $50 credit." This is more flexible but harder to get right.

Real systems often use a mix of both approaches.

## Common Mistakes

### 1. Rolling back a rollback

If the original operation was "change plan to Pro" and the rollback was "change plan back to Basic," what happens if you rollback the rollback? You need to either prevent this (only allow rollback of original operations) or handle the recursion carefully. Most systems just prevent it.

### 2. Assuming all operations are reversible

"Delete all customer data" might not be reversible if the data is truly gone. The system needs to distinguish between reversible and irreversible operations. A `supportRollback: boolean` flag on the command type would help.

### 3. Time-dependent rollback failures

You change a customer's plan at 2:00 PM. At 2:15 PM, the customer upgrades their plan again (a separate operation). At 2:30 PM, you try to rollback the 2:00 PM change. But the customer's plan is no longer what you changed it to -- it was changed again at 2:15 PM. This is a **conflict**. The rollback should detect this and report it as a blocker rather than blindly overwriting the 2:15 PM change.

### 4. Not recording who requested the rollback

Rollbacks are significant actions that should be attributed to a specific operator. The stub does not take an `operatorId` parameter, but the real version should. "Who rolled this back and why?" is a critical question during post-incident reviews.

## Mini Exercises

### Exercise 1: Add a Reason Parameter

Modify `rollbackOperation` to accept a second parameter `reason: string` that explains why the rollback is being requested. Include it in the return value. Why is this important for audit trails?

<details>
<summary>Hint</summary>

```typescript
export async function rollbackOperation(operationId: string, reason: string) {
  return { operationId, reason, status: "rollback_queued" as const };
}
```

In a real system, the reason would be stored in the rollback record and displayed in audit logs.
</details>

### Exercise 2: Draw the State Machine

On paper or in a markdown file, draw (or describe) the full state machine for an operation's lifecycle. Include all possible statuses and the transitions between them. Which transitions are valid? Which are invalid? For example, can an operation go from "failed" to "completed"?

<details>
<summary>Hint</summary>

Start with these states: `created`, `queued`, `running`, `completed`, `failed`, `rollback_queued`, `rolling_back`, `rolled_back`, `rollback_failed`, `cancelled`.

Valid transitions might include:
- `created` --> `queued`
- `queued` --> `running` or `cancelled`
- `running` --> `completed` or `failed`
- `completed` --> `rollback_queued`
- `rollback_queued` --> `rolling_back`
- `rolling_back` --> `rolled_back` or `rollback_failed`
</details>

### Exercise 3: Add Rollback to the Command Type

Go back to the `OperationCommand` type in `base.ts` and add an optional `rollback` method with the same signature as `execute`. Then update one of the scaffolded commands (say, `feature-flag-toggle`) to include a `rollback` implementation that toggles the flag back. Think about what data you would need in the payload to know what to toggle back to.

## Further Reading

- **The Saga Pattern:** A formal pattern for managing distributed transactions with compensating actions (rollbacks).
- **Event Sourcing:** Instead of storing current state, store a sequence of events. Rollback becomes "replay all events except the one being rolled back."
- **CQRS (Command Query Responsibility Segregation):** Separating read and write operations, which often pairs with event sourcing and makes rollback more natural.
- **Database transactions and ROLLBACK:** The SQL `ROLLBACK` command is the database-level version of this concept.
- **Git revert vs Git reset:** Two different approaches to "undoing" in version control -- `revert` creates a compensating commit (like a compensating action), while `reset` rewrites history (like a snapshot restore).
