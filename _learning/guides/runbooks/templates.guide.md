# Guide: Runbook Templates

**File:** `src/lib/runbooks/templates.ts`

## Purpose

A runbook is a predefined set of steps for handling a specific operational task. Think of it like a recipe: when something happens (a customer needs to be suspended, a region needs to fail over), you follow the runbook instead of figuring it out from scratch each time.

This file defines the available runbook templates. These are the *kinds* of runbooks your system supports. Each template name describes a specific operational scenario.

## The Code

```typescript
export const runbookTemplates = [
  "Customer Account Suspension",
  "Region Failover",
  "Billing Dispute Resolution",
  "Monthly Capacity Review",
] as const;
```

## Line-by-Line Walkthrough

### `export const runbookTemplates = [`

- `export` -- makes this array available to other modules.
- `const` -- the variable binding cannot be reassigned. But without `as const`, the array itself would still be mutable (you could `.push()` into it).
- `runbookTemplates` -- plural name indicates this is a collection.

### The Template Strings

Each string describes a specific operational scenario:

- **"Customer Account Suspension"** -- Disabling a customer's access, probably due to non-payment, terms of service violation, or at the customer's own request. A sensitive operation that needs a clear procedure.
- **"Region Failover"** -- Moving traffic from one geographic region to another, usually because the primary region is experiencing problems. This is one of the most critical runbooks in cloud infrastructure.
- **"Billing Dispute Resolution"** -- A customer disagrees with a charge. There is a specific process for investigating and resolving this.
- **"Monthly Capacity Review"** -- A recurring operational task where you review whether your infrastructure has enough capacity for expected growth. Not urgent, but important.

### `] as const;`

This is where it gets interesting. `as const` does two things to this array:

1. **Makes it readonly.** You cannot `push`, `pop`, or modify elements. `runbookTemplates.push("New Template")` would be a TypeScript compile error.

2. **Narrows the type from `string[]` to a tuple of literal strings.** Without `as const`, TypeScript sees this as `string[]` -- an array of any strings. With `as const`, TypeScript sees it as `readonly ["Customer Account Suspension", "Region Failover", "Billing Dispute Resolution", "Monthly Capacity Review"]`. Each position has a specific type.

This means you can derive a union type from the array:

```typescript
type RunbookTemplate = typeof runbookTemplates[number];
// Result: "Customer Account Suspension" | "Region Failover" | "Billing Dispute Resolution" | "Monthly Capacity Review"
```

That union type can be used in function signatures, form validation, and anywhere else you need to ensure a value is one of the known templates.

## Honesty About Code Quality

- **Just strings.** Each template is just a display name, not an object with an ID, description, steps, or metadata. In a real system, templates would be richer data structures.
- **Hardcoded.** These templates are baked into the code. Adding a new template requires a code change and redeployment. A more flexible system would store templates in a database.
- **No categories or tags.** Some templates are incident-related ("Region Failover"), some are routine ("Monthly Capacity Review"), and some are customer-facing ("Billing Dispute Resolution"). There is no way to filter by category.
- **No ordering.** The array order might matter for UI rendering, but there is no explicit `sortOrder` or `priority` field.

That said, hardcoded arrays with `as const` is a perfectly valid pattern for small, stable datasets. Not everything needs a database.

## Concepts Taught

1. **`as const` assertions on arrays** -- This is one of the most powerful TypeScript patterns for working with fixed sets of values. It bridges the gap between runtime data (the array) and compile-time types (the union). You see this pattern in production codebases constantly.

2. **Deriving types from values** -- `typeof runbookTemplates[number]` extracts a union type from the array. This is a "single source of truth" approach: the array is the source, and the type is derived from it. If you add a new template to the array, the type updates automatically.

3. **Readonly collections** -- `as const` makes the array readonly, preventing accidental mutation. This is a form of defensive programming. If someone tries to modify the array, TypeScript catches it at compile time instead of causing a subtle runtime bug.

4. **Constants as configuration** -- Not all configuration belongs in environment variables or databases. Small, stable, domain-specific lists often live in code. The key question is: "How often does this change, and who needs to change it?" If the answer is "rarely" and "developers," code is fine.

## Common Mistakes

1. **Trying to modify a `const` array without `as const`** -- `const arr = [1, 2, 3]` prevents reassignment (`arr = [4, 5]` is an error) but allows mutation (`arr.push(4)` works fine). Only `as const` makes the array truly immutable in TypeScript's eyes.

2. **Using `as const` but not deriving types from it** -- The main benefit of `as const` is type narrowing. If you never create a type from it (`typeof arr[number]`), you are not getting the full value. You might as well just use `string[]`.

3. **Putting dynamic data in `as const` arrays** -- `as const` is for data known at compile time. If the list of templates comes from a database, `as const` does not make sense because the values are not known until runtime.

4. **Confusing `readonly` with deeply frozen** -- `as const` makes TypeScript enforce immutability at compile time, but at runtime, the array is still a regular JavaScript array. If you deliberately bypass TypeScript (using `as any` or calling from JavaScript), you can still mutate it. Use `Object.freeze()` if you need runtime immutability.

## Mini Exercises

### Exercise 1: Derive a Union Type
Write a type alias `RunbookTemplateName` that is derived from the `runbookTemplates` array. Then write a function `isValidTemplate(name: string): name is RunbookTemplateName` that checks whether a string is one of the known templates.

<details>
<summary>Hint</summary>

```typescript
type RunbookTemplateName = typeof runbookTemplates[number];

function isValidTemplate(name: string): name is RunbookTemplateName {
  return (runbookTemplates as readonly string[]).includes(name);
}
```

The `name is RunbookTemplateName` return type is a "type predicate" -- it tells TypeScript that if this function returns true, the input can be treated as a `RunbookTemplateName`.
</details>

### Exercise 2: Add Metadata
Refactor the array from strings to objects, each with `name`, `category` (like `"incident"` or `"routine"`), and `description` fields. Keep the `as const` assertion. What does the inferred type look like now?

<details>
<summary>Hint</summary>

```typescript
export const runbookTemplates = [
  { name: "Customer Account Suspension", category: "customer", description: "Suspend a customer account" },
  { name: "Region Failover", category: "incident", description: "Fail over traffic to a healthy region" },
  // ...
] as const;
```

TypeScript will infer each object's properties as literal types, not just `string`.
</details>

### Exercise 3: Iterate with Type Safety
Write a function that takes a `RunbookTemplateName` and returns a formatted string. Use a `switch` statement covering all cases. What happens if you add a new template to the array but forget to add a case?

<details>
<summary>Hint</summary>

Use the "exhaustive switch" pattern:

```typescript
function describeTemplate(name: RunbookTemplateName): string {
  switch (name) {
    case "Customer Account Suspension": return "Suspend access for a customer";
    case "Region Failover": return "Move traffic to a backup region";
    case "Billing Dispute Resolution": return "Investigate a billing dispute";
    case "Monthly Capacity Review": return "Review infrastructure capacity";
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unhandled template: ${_exhaustive}`);
    }
  }
}
```

If you add a new template but miss a case, TypeScript will error on the `never` assignment.
</details>

## Further Reading

- **`as const` in depth** -- The TypeScript handbook section on "const assertions" covers all the nuances, including nested objects and arrays.
- **Deriving types from runtime values** -- This pattern (`typeof x[number]`) is part of a broader set of TypeScript techniques for keeping types in sync with data. Search for "TypeScript derive type from array."
- **Runbook design** -- Google's SRE book (free online) has a chapter on runbooks and operational procedures. Understanding why runbooks exist will make this code more meaningful.
- **Enums vs. union types vs. const arrays** -- TypeScript gives you three ways to define a fixed set of values. Each has tradeoffs. The `as const` array approach is generally the most flexible.
