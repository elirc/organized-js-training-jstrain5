# Guide: Runbooks Service

**File:** `src/lib/runbooks/service.ts`

## Purpose

This is the data access layer for runbooks. Like the feature flags service, it provides a function that the rest of the application uses to retrieve runbook data. And like the feature flags service, it is currently a stub that returns an empty array.

The pattern is identical by design. In a well-structured codebase, similar modules follow the same conventions. When you have seen one service file, you can predict the shape of every other service file. This predictability is a feature, not a sign of laziness.

## The Code

```typescript
export async function listRunbooks() {
  return [];
}
```

## Line-by-Line Walkthrough

### `export async function listRunbooks() {`

- Same pattern as `listFeatureFlags()` from the feature flags service.
- `async` because the real implementation will query a database or API.
- `listRunbooks` follows the `list` + entity name convention.
- No parameters, meaning it returns all runbooks. A real version would accept filters and pagination.

### `return [];`

Returns an empty array. Same `never[]` type inference issue as the feature flags service. Same solution: add a return type annotation once the `Runbook` type is defined.

## Honesty About Code Quality

Everything said about the feature flags service stub applies here too. To avoid repeating all of it, here is what is specific to runbooks:

- **No relationship to templates.** The `templates.ts` file defines template *names*, but there is no code connecting templates to actual runbook instances. In a real system, you would create a runbook *from* a template, and `listRunbooks` would return instances with their template information.
- **No status filtering.** Runbooks have lifecycle states (draft, active, completed, failed). Listing all of them without status filtering would be noisy in production.
- **No ownership or access control.** Who created each runbook? Who can see it? These are important questions that the stub does not address.

## Concepts Taught

1. **Consistency across modules** -- This file looks almost identical to the feature flags service. That is the point. When every service follows the same pattern, onboarding new developers is faster and code reviews are easier. "This looks like every other service file" is a compliment in a codebase, not a criticism.

2. **The value of empty stubs in architecture** -- This function does nothing, but it defines a boundary. The UI code that lists runbooks imports *this* function. When the real database is ready, you change *this* file and nothing else. The stub is a placeholder in the architecture, holding the spot for the real implementation.

3. **List functions as a starting point** -- In most CRUD systems, `list` is the first function you build because it drives the main UI view. `create`, `get` (single item), `update`, and `delete` follow. Starting with `list` is a common pattern.

## Common Mistakes

1. **Copy-pasting without renaming** -- When service files look this similar, it is tempting to copy one and forget to rename something. You could end up with `listRunbooks` that actually calls the feature flags database. Code reviews catch this, but it happens.

2. **Adding too much to the stub too early** -- It is tempting to immediately build out full CRUD, add filtering, add pagination. But if you do not know the exact requirements yet, you will build the wrong thing. Start with the simplest stub, then add functionality as real use cases demand it.

3. **Not documenting the intended return type** -- Even a stub should have a comment or type annotation indicating what the function *will* return. Without that, the next developer has to guess.

## Mini Exercises

### Exercise 1: Define the Runbook Type
Create a `Runbook` type that includes `id`, `title`, `templateName` (using the type derived from `templates.ts`), `status`, and `createdAt`. Add a return type annotation to `listRunbooks`.

<details>
<summary>Hint</summary>

```typescript
import { runbookTemplates } from "./templates";

type RunbookTemplateName = typeof runbookTemplates[number];
type RunbookStatus = "draft" | "active" | "completed" | "failed";

type Runbook = {
  id: string;
  title: string;
  templateName: RunbookTemplateName;
  status: RunbookStatus;
  createdAt: string;
};

export async function listRunbooks(): Promise<Runbook[]> {
  return [];
}
```

</details>

### Exercise 2: Return Mock Data
Add 2-3 hardcoded runbook objects to the return array. Make sure they match your `Runbook` type. Include different statuses to make the mock data realistic.

<details>
<summary>Hint</summary>

```typescript
return [
  {
    id: "rb_001",
    title: "Suspend Acme Corp",
    templateName: "Customer Account Suspension",
    status: "completed",
    createdAt: "2025-01-15T10:30:00Z",
  },
  {
    id: "rb_002",
    title: "US-East failover drill",
    templateName: "Region Failover",
    status: "active",
    createdAt: "2025-02-01T08:00:00Z",
  },
];
```

</details>

### Exercise 3: Add getRunbook
Write a companion function `getRunbook(id: string)` that finds and returns a single runbook by ID from the mock data. Return `undefined` if not found. What should the return type be?

<details>
<summary>Hint</summary>

```typescript
export async function getRunbook(id: string): Promise<Runbook | undefined> {
  const all = await listRunbooks();
  return all.find(rb => rb.id === id);
}
```

The return type is `Promise<Runbook | undefined>` because the runbook might not exist.
</details>

## Further Reading

- **Repository pattern** -- A formal name for this data access layer approach. The repository abstracts away the data source, providing a collection-like interface. Martin Fowler's "Patterns of Enterprise Application Architecture" describes it in depth.
- **CRUD operations** -- Understand the standard Create/Read/Update/Delete pattern and how it maps to HTTP methods (POST, GET, PUT/PATCH, DELETE) and SQL statements (INSERT, SELECT, UPDATE, DELETE).
- **Convention over configuration** -- A software design principle where consistent patterns reduce the need for documentation. If every service file follows the same structure, you do not need to document each one individually.
- **Interface segregation** -- If different callers need different things from the runbook service (one needs just titles, another needs full details), consider separate functions rather than one function that returns everything.
