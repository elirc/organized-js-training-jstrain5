# Guide: Command Implementation Pattern (All 17 Commands)

**Primary example file:** `src/lib/operations/commands/customer-plan-change.ts`
**Applies to all 17 command files.**

## Purpose

This guide covers the **pattern** that every single command file in the system follows. There are 17 of them, and they all look almost identical. That is not laziness -- it is deliberate **scaffolding**. The structure is in place, the wiring is in place, and the actual business logic is left as a placeholder to be filled in later.

Understanding this pattern once means understanding all 17 files. More importantly, it teaches you how to recognize scaffolding in a real codebase and how to think about what the "real" implementation would eventually look like.

## The Code (Primary Example)

```typescript
import type { OperationCommand } from "@/lib/operations/commands/base";

export const customer_plan_change: OperationCommand = {
  key: "customer.plan.change",
  dryRun: async (payload) => ({
    mode: "dry-run",
    payload,
    message: "Simulation complete for customer-plan-change.",
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
    message: "Execution queued for customer-plan-change.",
  }),
};
```

## Line-by-Line Walkthrough

### `import type { OperationCommand } from "@/lib/operations/commands/base";`

Imports the type we defined in the base guide. The `type` keyword ensures this is a compile-time-only import. Every command file starts with this exact same line.

### `export const customer_plan_change: OperationCommand = {`

- `export const` makes this a named export. Other files can do `import { customer_plan_change } from "..."`.
- `customer_plan_change` is the variable name. It uses `snake_case`, which is a bit unusual for TypeScript (where `camelCase` is more common). The name matches the file name and the command's purpose.
- `: OperationCommand` is a **type annotation**. It tells TypeScript "this object must conform to the OperationCommand shape." If you forget `key`, `dryRun`, or `execute`, or if their types are wrong, the compiler will flag it immediately. This is why the base type matters -- it provides a contract check at every command definition.

### `key: "customer.plan.change",`

The unique identifier for this command. It uses **dot-notation namespacing**:

- `customer` -- the domain/entity this command affects
- `plan` -- the specific resource within that domain
- `change` -- the action being performed

This naming convention makes commands self-documenting and easy to organize. You can tell at a glance what `billing.invoice.void` does without reading its code. It also enables pattern-based permissions (e.g., "this operator can run any `customer.*` command") and logging/filtering.

### `dryRun: async (payload) => ({`

An async arrow function. The parentheses around the object literal are important -- without them, JavaScript would interpret the `{` as a function body, not an object:

```typescript
// This WORKS -- parens force the object to be an expression
async (payload) => ({ mode: "dry-run" })

// This BREAKS -- JS thinks { is a function body block
async (payload) => { mode: "dry-run" }  // SyntaxError or unexpected behavior
```

The current implementation is a **stub**. It echoes back the payload with a mode label and a message. It does not actually simulate anything. In a real system, this function would:

- Validate the payload
- Look up the customer and their current plan
- Check for blockers (unpaid invoices, pending migrations, contract locks)
- Calculate the cost difference
- Return a detailed simulation result without making any changes

### `mode: "dry-run",`

A string label so the caller can confirm which mode ran. Useful during development and debugging.

### `payload,`

This is shorthand for `payload: payload` -- it echoes the input back in the output. A real implementation would not do this. You would return meaningful simulation results instead.

### `message: "Simulation complete for customer-plan-change.",`

A human-readable message. In the scaffold, this is hardcoded. In production, it might be dynamically generated based on what the simulation found.

### `execute: async (payload) => ({`

Same structure as `dryRun`, but with `mode: "execute"` and a message saying "Execution queued." The word "queued" is significant -- it suggests that in the real system, commands would not execute synchronously. They would be placed on a queue (like a message broker) and processed asynchronously. This is common for operations that might take a long time or need to be retried.

## The Complete List of 17 Commands

All follow the identical pattern. Here they are organized by domain:

### Customer Domain
| File | Export Name | Key |
|---|---|---|
| `customer-plan-change.ts` | `customer_plan_change` | `customer.plan.change` |
| `customer-suspend.ts` | `customer_suspend` | `customer.suspend` |
| `customer-unsuspend.ts` | `customer_unsuspend` | `customer.unsuspend` |
| `customer-delete.ts` | `customer_delete` | `customer.delete` |
| `customer-credit-issue.ts` | `customer_credit_issue` | `customer.credit.issue` |
| `customer-data-export.ts` | `customer_data_export` | `customer.data.export` |

### Account Domain
| File | Export Name | Key |
|---|---|---|
| `account-api-key-rotate.ts` | `account_api_key_rotate` | `account.api-key.rotate` |
| `account-usage-reset.ts` | `account_usage_reset` | `account.usage.reset` |

### Billing Domain
| File | Export Name | Key |
|---|---|---|
| `billing-refund.ts` | `billing_refund` | `billing.refund` |
| `billing-credit-bulk.ts` | `billing_credit_bulk` | `billing.credit.bulk` |
| `billing-invoice-void.ts` | `billing_invoice_void` | `billing.invoice.void` |

### Feature Flags Domain
| File | Export Name | Key |
|---|---|---|
| `feature-flag-toggle.ts` | `feature_flag_toggle` | `feature-flag.toggle` |
| `feature-flag-rollout.ts` | `feature_flag_rollout` | `feature-flag.rollout` |

### Infrastructure Domain
| File | Export Name | Key |
|---|---|---|
| `infra-service-toggle.ts` | `infra_service_toggle` | `infra.service.toggle` |
| `infra-region-failover.ts` | `infra_region_failover` | `infra.region.failover` |
| `infra-rate-limit-adjust.ts` | `infra_rate_limit_adjust` | `infra.rate-limit.adjust` |

## Concepts Taught

### 1. Scaffolding as a Strategy

Every one of these 17 files is a placeholder. That might seem like wasted code, but it serves real purposes:

- **Structure is decided early.** The team has agreed on the shape of commands, the naming convention, and the file organization. When it is time to implement `billing.refund` for real, the developer does not need to make architectural decisions -- they just fill in the function body.
- **Integration testing works now.** Even with stubs, you can wire up the registry, the engine, the UI, and the API routes. Everything connects. The only thing missing is the business logic inside each function.
- **New team members can contribute immediately.** Picking up a stub and implementing it is much easier than designing the whole system from scratch.

This is sometimes called "programming by wishful thinking" -- you define the interfaces and call sites first, then fill in the implementations.

### 2. Dot-Notation Namespacing

The keys (`customer.plan.change`, `billing.refund`, etc.) use dots as separators to create a hierarchy. This is not enforced by the type system (the key is just `string`), but it is a team convention. Dot-notation namespacing is used in many systems:

- Java package names (`com.company.module.Class`)
- Redis key naming (`user:123:session`)
- Metric names in monitoring (`api.requests.duration.p99`)
- Event names in message brokers (`order.created`, `order.shipped`)

Benefits: commands are self-documenting, you can filter by prefix for permissions and logging, and naming collisions are unlikely.

### 3. Async Arrow Functions Returning Object Literals

The `async (payload) => ({ ... })` syntax is compact but has a gotcha that trips people up. The parentheses around the object literal are mandatory. This is one of those JavaScript quirks you just have to memorize.

### 4. Satisfies / Type Annotation for Validation

The `: OperationCommand` annotation on each export is what keeps the 17 files honest. If someone edits `customer-suspend.ts` and accidentally deletes the `dryRun` method, the compiler catches it immediately. Without the annotation, TypeScript would just infer whatever shape the object happens to have, and the error would surface later (at runtime, or in a completely different file).

### 5. What Real Implementations Would Look Like

Here is what `customer_plan_change` might look like once implemented:

```typescript
export const customer_plan_change: OperationCommand = {
  key: "customer.plan.change",

  dryRun: async (payload) => {
    const { customerId, newPlanId } = payload as {
      customerId: string;
      newPlanId: string;
    };

    const customer = await db.customers.findById(customerId);
    if (!customer) {
      return { success: false, blockers: ["Customer not found"] };
    }

    const currentPlan = await db.plans.findById(customer.planId);
    const newPlan = await db.plans.findById(newPlanId);

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (customer.status === "suspended") {
      blockers.push("Cannot change plan for suspended customer");
    }
    if (customer.hasUnpaidInvoices) {
      warnings.push("Customer has unpaid invoices");
    }

    const priceDifference = newPlan.monthlyPrice - currentPlan.monthlyPrice;

    return {
      success: blockers.length === 0,
      blockers,
      warnings,
      preview: {
        currentPlan: currentPlan.name,
        newPlan: newPlan.name,
        priceDifference,
        effectiveDate: new Date().toISOString(),
      },
    };
  },

  execute: async (payload) => {
    const { customerId, newPlanId, operatorId } = payload as {
      customerId: string;
      newPlanId: string;
      operatorId: string;
    };

    // Run dry-run checks first
    // Update the database
    // Publish event to message queue
    // Create audit log entry
    // Return confirmation

    await db.customers.update(customerId, { planId: newPlanId });
    await auditLog.record({
      action: "customer.plan.change",
      operatorId,
      targetId: customerId,
      details: { newPlanId },
    });
    await eventBus.publish("customer.plan.changed", { customerId, newPlanId });

    return {
      success: true,
      operationId: generateId(),
      message: `Plan changed to ${newPlanId} for customer ${customerId}`,
    };
  },
};
```

Notice how much more code the real version has -- validation, database lookups, audit logging, event publishing. The scaffold gives you the skeleton; the implementation gives it life.

## Common Mistakes

### 1. Forgetting the parentheses around the returned object

```typescript
// WRONG -- JavaScript thinks { is a function body
dryRun: async (payload) => {
  mode: "dry-run",  // This is a labeled statement, not a property
}

// RIGHT -- parentheses force object expression
dryRun: async (payload) => ({
  mode: "dry-run",
})
```

This is the single most common mistake with arrow functions that return objects. JavaScript's parser is ambiguous here and defaults to "function body" interpretation.

### 2. Mismatched keys and file names

If `customer-plan-change.ts` defines a command with key `"customer.suspend"`, that is a bug. The file name, the export name, and the key should all clearly relate to the same operation. Consistency matters for maintenance.

### 3. Not registering the command

Creating the command file is only half the job. It must also be passed to `registerCommand()` somewhere. Otherwise it is dead code -- it exists but nothing can find it.

### 4. Copy-paste errors

When all 17 files look the same, it is very easy to copy one, rename the file, update the export name and key, but forget to change the message string. You end up with `billing-refund.ts` saying "Simulation complete for customer-plan-change." This does not break anything functionally, but it is confusing in logs. Code review should catch this, but being careful during copy-paste is better.

## Mini Exercises

### Exercise 1: Create the 17th Command

There is actually a 16th command listed above, not 17 (the list varies depending on how you count -- the spec says 17). Invent a plausible 17th command. Pick a domain, choose a meaningful name, follow the naming conventions, and write the full scaffolded file. Make sure the key, export name, and file name are all consistent.

<details>
<summary>Hint</summary>

Maybe `infra-cache-purge.ts` with key `"infra.cache.purge"` and export `infra_cache_purge`? Or `customer-password-reset.ts`? Pick something that fits the existing domains.
</details>

### Exercise 2: Write a Real `dryRun` for `billing.refund`

Imagine the payload is `{ invoiceId: string, amount: number, reason: string }`. Write a `dryRun` implementation that:
- Checks if `amount` is positive
- Checks if `amount` is less than 10000 (a safety limit)
- Returns `blockers` if either check fails
- Returns a `preview` object with the refund details if checks pass

You do not need real database calls -- just write the logic with the payload values.

<details>
<summary>Hint</summary>

```typescript
dryRun: async (payload) => {
  const { invoiceId, amount, reason } = payload as {
    invoiceId: string;
    amount: number;
    reason: string;
  };

  const blockers: string[] = [];

  if (amount <= 0) blockers.push("Refund amount must be positive");
  if (amount >= 10000) blockers.push("Refund amount exceeds safety limit of $10,000");
  if (!reason) blockers.push("Refund reason is required");

  return {
    success: blockers.length === 0,
    blockers,
    preview: blockers.length === 0
      ? { invoiceId, amount, reason, estimatedProcessingTime: "2-3 business days" }
      : null,
  };
},
```
</details>

### Exercise 3: Automate Registration

Right now, each command must be manually imported and passed to `registerCommand`. Write a hypothetical `register-all.ts` file that imports all 17 commands and registers them in a loop. Use an array to keep it DRY.

<details>
<summary>Hint</summary>

```typescript
import { registerCommand } from "@/lib/operations/commands/registry";
import { customer_plan_change } from "./customer-plan-change";
import { customer_suspend } from "./customer-suspend";
// ... import the rest ...

const allCommands = [
  customer_plan_change,
  customer_suspend,
  // ... the rest ...
];

allCommands.forEach(registerCommand);
```

In a more advanced setup, you could use dynamic imports or a bundler-level feature (like Vite's `import.meta.glob`) to auto-discover command files.
</details>

## Further Reading

- **Scaffolding in software projects:** How and why teams stub out code before implementing it.
- **Convention over configuration:** The Rails philosophy of using naming conventions to reduce boilerplate, which is exactly what the dot-notation keys achieve.
- **Arrow function gotchas in JavaScript:** The MDN docs cover the object literal parenthesization issue and other subtleties.
- **Event-driven architecture naming conventions:** How systems like Kafka, RabbitMQ, and EventBridge use hierarchical event names.
- **Vite's `import.meta.glob`:** A way to auto-import files matching a pattern, which could replace manual registration.
