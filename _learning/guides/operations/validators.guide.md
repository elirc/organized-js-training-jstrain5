# Guide: Operation Validators

**File:** `src/lib/operations/validators.ts`

## Purpose

Validation is the bouncer at the door. Before an operation executes, the validator checks whether the inputs are sane, the state is correct, and the request is well-formed. If validation fails, the operation never runs. This is cheaper, safer, and easier to debug than letting a bad operation get halfway through and then crash.

This file provides a single validation function that, in its current scaffolded form, always says "everything is fine." In a real system, it would be the most critical safety check before any dangerous action.

## The Code

```typescript
export async function validateOperationInputs() {
  return { valid: true, blockers: [] as string[] };
}
```

## Line-by-Line Walkthrough

### `export async function validateOperationInputs() {`

- `export async function` -- public, async, same conventions as the rest of the operations module.
- `validateOperationInputs` -- note the name says "inputs," not just "operation." This signals that the function's job is to check the **data** being passed in, not to check whether the system is ready or the operator has permission. Those are separate concerns (system health checks and authorization, respectively).
- `()` -- takes no parameters. This is the most obvious sign that this is a stub. A real validator needs to know **what** it is validating. At minimum, it would take the command key and the payload.

### `return { valid: true, blockers: [] as string[] };`

The return shape has two properties:

- `valid: true` -- a boolean flag indicating whether validation passed. Currently hardcoded to `true`.
- `blockers: [] as string[]` -- an array of reasons why validation failed. Currently empty. The `as string[]` cast is important here -- without it, TypeScript would infer `never[]`, and you could never push strings into it. The `as string[]` tells TypeScript "this is an empty string array that could eventually hold strings."

This is the same blockers concept from the dry-run guide. The difference is context: dry-run blockers are about the **state of the world** (customer has a legal hold), while validation blockers are about the **inputs** (missing required field, invalid format, out-of-range value).

## What This Function Will Become

Here is what a real implementation might look like:

```typescript
import { getCommand } from "@/lib/operations/commands/registry";

type ValidationResult = {
  valid: boolean;
  blockers: string[];
};

// Per-command payload schemas (simplified -- in practice, use Zod or similar)
const payloadSchemas: Record<string, Record<string, string>> = {
  "customer.plan.change": { customerId: "string", newPlanId: "string" },
  "customer.suspend": { customerId: "string", reason: "string" },
  "billing.refund": { invoiceId: "string", amount: "number", reason: "string" },
  // ... etc for all 17 commands
};

export async function validateOperationInputs(
  command: string,
  payload: Record<string, unknown>
): Promise<ValidationResult> {
  const blockers: string[] = [];

  // 1. Check if the command exists
  const cmd = getCommand(command);
  if (!cmd) {
    blockers.push(`Unknown command: "${command}"`);
    return { valid: false, blockers };
  }

  // 2. Check if the payload matches the expected schema
  const schema = payloadSchemas[command];
  if (schema) {
    for (const [field, expectedType] of Object.entries(schema)) {
      if (!(field in payload)) {
        blockers.push(`Missing required field: "${field}"`);
      } else if (typeof payload[field] !== expectedType) {
        blockers.push(`Field "${field}" must be ${expectedType}, got ${typeof payload[field]}`);
      }
    }
  }

  // 3. Command-specific validation
  if (command === "billing.refund") {
    const amount = payload.amount as number;
    if (amount <= 0) blockers.push("Refund amount must be positive");
    if (amount > 50000) blockers.push("Refund amount exceeds $50,000 limit");
  }

  return { valid: blockers.length === 0, blockers };
}
```

In a production codebase, you would likely use a schema validation library like **Zod** instead of hand-rolling type checks. Zod gives you both runtime validation and TypeScript type inference from a single schema definition.

## Concepts Taught

### 1. Input Validation vs Business Validation

There are two layers of validation in most systems:

- **Input validation (this file):** Is the data well-formed? Are required fields present? Are types correct? Is the email format valid? This is about the **shape and format** of the inputs.
- **Business validation (dry-run / command-level):** Is this a sensible thing to do? Does the customer exist? Is their account in the right state? Are they eligible for this action? This is about the **meaning and context** of the inputs.

The validator handles layer one. The dry-run and command-level `dryRun` methods handle layer two. Keeping them separate means input validation can be fast and stateless (no database calls needed), while business validation can be as thorough as needed.

### 2. The Validation Result Pattern

Returning `{ valid: boolean, blockers: string[] }` is a clean pattern because:

- The caller gets a simple boolean to branch on (`if (!result.valid) return;`)
- The caller also gets **specific reasons** for failure, which can be shown to the user
- It is composable -- you can merge results from multiple validators

An alternative is throwing errors, but that has downsides:
- You only get one error at a time (the first thing that throws)
- Error handling logic (try/catch) is clunkier than simple conditionals
- It is harder to collect all validation errors to show them at once

The "collect all errors" approach is almost always better for validation, because users want to fix all their mistakes at once, not play whack-a-mole fixing one error at a time only to discover the next.

### 3. `as string[]` Type Assertion on Empty Arrays

```typescript
blockers: [] as string[]
```

This is a pragmatic workaround for TypeScript's inference of empty arrays. Without the assertion, `[]` is inferred as `never[]`, which means you can never add elements to it. With `as string[]`, you are telling TypeScript "trust me, this array will hold strings." This is one of the few places where `as` assertions are justified and not a code smell.

An alternative that avoids the assertion:

```typescript
const blockers: string[] = [];
return { valid: true, blockers };
```

By declaring `blockers` as a variable with an explicit type before using it in the return, you avoid the `as` assertion entirely. Some teams prefer this style.

### 4. Fail-Fast Validation

The validator runs **before** the engine, the dry-run, or the command's `execute` method. This is the "fail-fast" principle: catch problems as early as possible, when they are cheapest to handle. A missing field caught in validation is a simple error message. A missing field caught during execution might leave the system in a partially updated state.

### 5. Stateless vs Stateful Validation

Input validation can usually be **stateless** -- you do not need to query a database to know that a field is missing or that an email is malformed. Business validation is typically **stateful** -- you need to look up the customer record to know if they are suspended.

Keeping input validation stateless has performance benefits: it is fast, it can run on the client side (in the browser, before the form is submitted), and it does not add load to the database.

## Common Mistakes

### 1. Validating in the wrong layer

If validation logic is scattered across multiple modules (some in the API route, some in the engine, some in the command), it becomes hard to know what has been validated by the time code runs. Centralizing input validation in one function (this one) makes the validation boundary clear.

### 2. Only validating the happy path

Validators are often written to check "is this field present?" but not "is this field a reasonable value?" Checking that `amount` exists is not enough -- you also need to check that it is a number, that it is positive, that it is within allowed bounds, etc.

### 3. Returning `valid: true` with non-empty blockers

This is a logic bug:

```typescript
return { valid: true, blockers: ["Something is wrong"] };
// The boolean says fine, the blockers say otherwise
```

Always derive `valid` from the blockers: `valid: blockers.length === 0`. Never set them independently.

### 4. Not handling `undefined` and `null`

In JavaScript, a missing property is `undefined`, not `null`. But many APIs send `null` for empty values. A good validator checks for both:

```typescript
if (payload.customerId == null) {  // == catches both undefined and null
  blockers.push("customerId is required");
}
```

### 5. Hardcoding `valid: true` in production

The current stub always returns `valid: true`. That is fine for scaffolding. But if you forget to replace the stub with real logic, every operation will pass validation regardless of inputs. Always replace stubs before going to production.

## Mini Exercises

### Exercise 1: Add Parameters and Basic Validation

Modify `validateOperationInputs` to take `command: string` and `payload: Record<string, unknown>`. Add validation that:
- The `command` string is not empty
- The `payload` is not an empty object
- Return appropriate blockers for each failure

<details>
<summary>Hint</summary>

```typescript
export async function validateOperationInputs(
  command: string,
  payload: Record<string, unknown>
) {
  const blockers: string[] = [];

  if (!command || command.trim() === "") {
    blockers.push("Command is required");
  }

  if (Object.keys(payload).length === 0) {
    blockers.push("Payload cannot be empty");
  }

  return { valid: blockers.length === 0, blockers };
}
```
</details>

### Exercise 2: Use Zod for Validation

Install nothing -- just write the code. Define a Zod schema for the `billing.refund` payload (`invoiceId: string`, `amount: number > 0`, `reason: string, min length 10`). Show how you would use `schema.safeParse(payload)` to validate and convert Zod errors into the `{ valid, blockers }` format.

<details>
<summary>Hint</summary>

```typescript
import { z } from "zod";

const billingRefundSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Amount must be positive"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

function validateWithZod(schema: z.ZodSchema, payload: unknown) {
  const result = schema.safeParse(payload);
  if (result.success) {
    return { valid: true, blockers: [] as string[] };
  }
  return {
    valid: false,
    blockers: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
  };
}
```
</details>

### Exercise 3: Compose Multiple Validators

Write a `composeValidators` function that takes an array of validator functions (each returning `Promise<{ valid: boolean, blockers: string[] }>`) and runs them all, merging the blockers. The result should be `valid: true` only if every individual validator returned `valid: true`.

<details>
<summary>Hint</summary>

```typescript
type ValidationResult = { valid: boolean; blockers: string[] };
type Validator = () => Promise<ValidationResult>;

async function composeValidators(validators: Validator[]): Promise<ValidationResult> {
  const results = await Promise.all(validators.map((v) => v()));
  const allBlockers = results.flatMap((r) => r.blockers);
  return { valid: allBlockers.length === 0, blockers: allBlockers };
}
```
</details>

## Further Reading

- **Zod:** A TypeScript-first schema validation library that gives you runtime validation and type inference from the same definition.
- **Joi, Yup, AJV:** Other popular validation libraries with different trade-offs.
- **Parse, don't validate:** A foundational article by Alexis King about why parsing (transforming untyped data into typed data) is better than validation (checking data and hoping for the best).
- **Railway-oriented programming:** A functional programming pattern for chaining validation steps where each step can fail.
- **Form validation UX best practices:** How to show validation errors to users in a way that is helpful, not frustrating.
