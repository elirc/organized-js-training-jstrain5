# Guide: Approval Service

**File:** `src/lib/approvals/service.ts`

## Purpose

This file is responsible for creating approval requests. When the system determines that an operation needs human sign-off (using the policy from `policies.ts`), this function creates the record that represents that pending approval.

Think of it like filling out a form at a government office. You submit the form (create the approval request) and then wait for someone to stamp it. This function handles the "submit the form" part.

Right now, this is a scaffold -- it returns a hardcoded object instead of talking to a real database. That is completely normal during early development. You build the interface first, then wire up the real implementation later.

## The Code

```typescript
export async function createApprovalRequest(operationId: string) {
  return { operationId, status: "pending" as const };
}
```

## Line-by-Line Walkthrough

### `export async function createApprovalRequest(operationId: string) {`

- `export` -- makes this function importable by other modules.
- `async` -- marks this function as asynchronous. It returns a `Promise`. Even though the current implementation does not do anything asynchronous (no database call, no network request), the `async` keyword is there because the *real* implementation will. This is an important design choice: you define the interface based on what it *will* do, not what the placeholder does right now.
- `operationId: string` -- a unique identifier for the operation that needs approval. This links the approval back to the thing being approved.

### `return { operationId, status: "pending" as const };`

- `{ operationId, status: "pending" }` -- returns a plain object. Notice `operationId` uses shorthand property syntax: `{ operationId }` is the same as `{ operationId: operationId }`.
- `"pending" as const` -- this is a TypeScript feature called a **const assertion**. Without it, TypeScript would infer `status` as type `string`. With `as const`, TypeScript narrows the type to the literal `"pending"`. This matters when other code needs to check `if (result.status === "pending")` -- TypeScript can verify that comparison is valid.

## Honesty About Code Quality

This function is a stub. Let's be clear about what it does *not* do that a real version would:

- **No database write.** A real implementation would insert a row into an approvals table.
- **No validation.** It does not check whether the `operationId` actually exists or is valid.
- **No timestamp.** A real approval request would record when it was created.
- **No approver assignment.** Who is supposed to approve this? The function does not address that.
- **No error handling.** What happens if the database is down? No try/catch, no retry logic.

The scaffold is useful because it lets other parts of the system (like the UI or the API layer) develop against this interface without waiting for the database to be set up.

## Concepts Taught

1. **Async functions and Promises** -- `async` functions always return a `Promise`. When you `return { ... }` inside an async function, the caller receives `Promise<{ operationId: string; status: "pending" }>`. The caller will need to `await` it.

2. **Const assertions (`as const`)** -- This is one of TypeScript's most useful features for working with literal types. It tells the compiler "this value is exactly this, not just any string." You will see this pattern throughout the codebase.

3. **Scaffolding / stub pattern** -- Writing a function that has the correct *signature* (name, parameters, return type) but a fake *implementation*. This lets you build the rest of the system in parallel. It is a legitimate and common professional practice.

4. **Shorthand property names** -- `{ operationId }` instead of `{ operationId: operationId }`. This is standard modern JavaScript and you will see it everywhere.

## Common Mistakes

1. **Forgetting to `await` async functions** -- If you call `createApprovalRequest("op_123")` without `await`, you get a Promise object, not the result. Your code will appear to work but you will be passing `Promise` objects around instead of actual data.

2. **Confusing `as const` with `as`** -- `"pending" as const` narrows the type. `"pending" as string` widens it. They look similar but do opposite things. `as const` is safe; arbitrary `as` casts can hide bugs.

3. **Thinking stubs are bad code** -- Junior developers sometimes feel guilty about placeholder implementations. They are not bad. They are a strategy. The key is knowing they need to be replaced and tracking that work (often with TODO comments or tickets).

4. **Not matching the async signature to future needs** -- If you wrote this as a synchronous function now and changed it to async later, every caller would break. Starting with `async` avoids that migration pain.

## Mini Exercises

### Exercise 1: Add a Timestamp
Modify the return object to include a `createdAt` field with the current ISO timestamp (`new Date().toISOString()`). Think about what type TypeScript will infer for this field.

<details>
<summary>Hint</summary>
Just add `createdAt: new Date().toISOString()` to the returned object. TypeScript will infer `string` for this field.
</details>

### Exercise 2: Add a requestedBy Parameter
Add a second parameter `requestedBy: string` to the function, and include it in the returned object. Think about why you might want to track who requested the approval.

<details>
<summary>Hint</summary>
For audit trails: you need to know not just *what* was requested, but *who* requested it.
</details>

### Exercise 3: Call This From Another File
Create a small scratch file that imports `createApprovalRequest`, calls it with `await`, and logs the result. You will need to use `async/await` at the call site.

<details>
<summary>Hint</summary>

```typescript
import { createApprovalRequest } from "@/lib/approvals/service";

async function main() {
  const approval = await createApprovalRequest("op_001");
  console.log(approval);
}

main();
```

</details>

## Further Reading

- **Promises and async/await** -- MDN's guide on async functions is the best starting point. Understand what happens under the hood when you use `await`.
- **TypeScript const assertions** -- The TypeScript handbook section on "const assertions" explains all the places you can use `as const` and why.
- **Stub/mock/fake terminology** -- In testing, these words have specific meanings. A stub returns hardcoded data (like this function). A mock also verifies how it was called. A fake has working logic but uses in-memory storage.
- **CQRS pattern** -- This function is a "command" (it creates something). Separating commands from queries is a powerful architectural pattern you will encounter in larger systems.
