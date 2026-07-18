# Guide: Feature Flags Service

**File:** `src/lib/feature-flags/service.ts`

## Purpose

This file provides the data access layer for feature flags. When the application needs to know what flags exist, it calls this function. Right now it returns an empty array because there is no database or API wired up yet.

Even though this function is tiny, it establishes an important boundary in the architecture: the rest of the application asks for feature flags through this service, rather than querying a database directly. This means you can swap out the data source later (from hardcoded to database, from database to external API) without changing any of the calling code.

## The Code

```typescript
export async function listFeatureFlags() {
  return [];
}
```

## Line-by-Line Walkthrough

### `export async function listFeatureFlags() {`

- `export` -- other modules will import this to get the list of flags.
- `async` -- the real implementation will fetch data from a database or API, both of which are asynchronous operations.
- `listFeatureFlags` -- the `list` prefix is a naming convention for functions that return collections. You will often see `list`, `get`, `find`, `create`, `update`, `delete` as prefixes in service files.
- No parameters -- this function lists *all* flags. In a real implementation, you might add filtering parameters like `listFeatureFlags({ isEnabled: true })`.

### `return [];`

Returns an empty array. TypeScript infers the return type as `Promise<never[]>` -- a Promise that resolves to an array of... nothing. This is technically correct for an empty array, but it means callers cannot rely on the type system to know what shape the items will have.

In a real implementation, you would return `FeatureFlag[]` (using the type from `evaluator.ts`), and TypeScript would enforce that the returned objects match that shape.

## Honesty About Code Quality

This is about as minimal as a function can be. Let's be honest about it:

- **The return type is too vague.** `never[]` does not help callers. The function should either have an explicit return type annotation (`Promise<FeatureFlag[]>`) or return typed mock data so TypeScript can infer a useful type.
- **No filtering, pagination, or sorting.** A real list function would accept parameters for these. Listing *all* flags without any limits is fine when you have 5 flags, but breaks down at 5,000.
- **No error handling.** What happens when the database is unreachable? This stub cannot fail, but the real implementation can and will.
- **No caching.** Feature flags are read frequently (potentially on every request) and change rarely. A real implementation would cache the flag list and invalidate on changes.

The stub exists to define the interface and unblock other developers. That is its job, and it does that job.

## Concepts Taught

1. **Service layer pattern** -- A service file acts as a boundary between your application logic and your data sources. The rest of the app calls `listFeatureFlags()` without knowing whether the data comes from a database, an in-memory cache, a REST API, or a hardcoded array. This decoupling is one of the most important patterns in software architecture.

2. **CRUD naming conventions** -- `list`, `get`, `create`, `update`, `delete` (sometimes `find`, `remove`, `upsert`). These verbs map to database operations and HTTP methods. Consistent naming makes your codebase navigable. When you see a file called `service.ts`, you expect to find these kinds of functions.

3. **Return type inference from empty arrays** -- TypeScript cannot infer the element type of an empty array. `[]` is `never[]`, which is not useful. This is a common gotcha. The fix is to either annotate the return type or cast the array: `return [] as FeatureFlag[]`.

4. **Stubs as API contracts** -- This stub tells you: "There will be a function called `listFeatureFlags` that takes no arguments and returns a Promise of an array." That contract is enough for other developers to write code against.

## Common Mistakes

1. **Forgetting to `await` the result** -- Since this is `async`, calling `listFeatureFlags()` returns a Promise. If you write `const flags = listFeatureFlags()` without `await`, `flags` is a Promise object, not an array. Trying to call `.map()` or `.filter()` on it will fail.

2. **Not typing the return value** -- Leaving the return type as `never[]` means TypeScript cannot help callers. They will not get autocomplete on the array elements, and type errors will not be caught until runtime.

3. **Putting business logic in the service layer** -- The service layer should handle data access. Flag *evaluation* logic belongs in `evaluator.ts`. Mixing data fetching and business logic in the same function makes both harder to test and harder to understand.

4. **Building the real implementation too early** -- It is tempting to immediately wire up a database. But if the data model is still changing, you will spend time migrating schemas instead of building features. Stubs let you defer that work until the model is stable.

## Mini Exercises

### Exercise 1: Return Mock Data
Replace the empty array with a few hardcoded feature flag objects that match the `FeatureFlag` type from `evaluator.ts`. Include at least one boolean flag, one percentage flag, and one targeted flag.

<details>
<summary>Hint</summary>

```typescript
import type { FeatureFlag } from "@/lib/feature-flags/evaluator";

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  return [
    {
      key: "dark-mode",
      flagType: "boolean",
      isEnabled: true,
      rolloutPercentage: 0,
      targetingRules: [],
    },
    {
      key: "new-checkout",
      flagType: "percentage",
      isEnabled: true,
      rolloutPercentage: 25,
      targetingRules: [],
    },
  ];
}
```

Note: you would need to export the `FeatureFlag` type from `evaluator.ts` first.
</details>

### Exercise 2: Add a Filter Parameter
Add an optional parameter `filter?: { isEnabled?: boolean }` that lets callers request only enabled or disabled flags. Apply the filter to your mock data using `.filter()`.

<details>
<summary>Hint</summary>

```typescript
export async function listFeatureFlags(filter?: { isEnabled?: boolean }) {
  const allFlags = [ /* your mock data */ ];
  if (filter?.isEnabled !== undefined) {
    return allFlags.filter(f => f.isEnabled === filter.isEnabled);
  }
  return allFlags;
}
```

The `?.` (optional chaining) handles the case where `filter` is undefined.
</details>

### Exercise 3: Add an Explicit Return Type
Add `: Promise<FeatureFlag[]>` as the return type annotation. Then try returning an object that does not match the `FeatureFlag` shape and observe what TypeScript tells you.

<details>
<summary>Hint</summary>

```typescript
export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  return [{ wrong: "shape" }]; // TypeScript will error here
}
```

The error will tell you exactly which properties are missing or wrong. This is why return type annotations are valuable.
</details>

## Further Reading

- **Service layer / repository pattern** -- Learn the difference between a "service" (business logic) and a "repository" (data access). Some codebases split these; this project combines them in a single service file.
- **TypeScript utility types** -- `Promise<T>`, `Partial<T>`, `Pick<T, K>` are all useful for typing service functions. The TypeScript handbook's section on utility types is worth reading cover to cover.
- **Caching strategies** -- When you replace this stub with a real implementation, you will need to decide how to cache flag data. Look into "cache-aside" (also called "lazy loading") and "write-through" patterns.
- **Pagination** -- For any `list` function, you will eventually need pagination. Search for "cursor-based pagination vs offset pagination" to understand the tradeoffs.
