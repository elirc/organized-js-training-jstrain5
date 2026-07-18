# Guide: Customer Detail Route (GET by ID and PATCH)

**File covered:** `src/app/api/customers/[id]/route.ts`

---

## Purpose

This file handles operations on a **single customer**. While the customers list route (`/api/customers`) deals with the collection, this route deals with one specific item identified by its `id` in the URL. It supports two operations:

- **GET** -- Fetch one customer's full details.
- **PATCH** -- Partially update a customer (change their status or plan).

This is your first look at **dynamic route segments** (`[id]`), **request body parsing**, and **partial updates** in this project.

---

## Line-by-line walkthrough

### Imports and type definition

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/http/envelope";
import { mockCustomers } from "@/lib/mock/customers";
```

Same imports you saw in the customers list route. Nothing new here.

```typescript
type Params = { params: { id: string } };
```

This defines the shape of the second argument that Next.js passes to route handlers in dynamic segments. Because the folder is named `[id]`, Next.js extracts the `id` from the URL and passes it as `params.id`. If the URL is `/api/customers/cust_42`, then `params.id` is `"cust_42"`.

You define this type yourself because Next.js does not export a specific type for your route's params. This is a common pattern you will see in every dynamic route file.

### The PATCH validation schema

```typescript
const patchSchema = z.object({
  status: z.enum(["active", "suspended", "churned"]).optional(),
  plan: z.enum(["free", "starter", "business", "enterprise"]).optional(),
});
```

This defines what fields can be updated and what values are acceptable. Both fields are `.optional()`, meaning a PATCH request can update just the status, just the plan, or both. This is the nature of PATCH -- it is a **partial update**. You send only the fields you want to change.

If someone sends `{ "status": "deleted" }`, Zod will reject it because `"deleted"` is not in the enum. If someone sends `{ "companyName": "New Name" }`, Zod will silently strip it (by default, `z.object` ignores extra keys). The customer's name cannot be changed through this endpoint.

### GET handler -- Fetch one customer

```typescript
export async function GET(_req: NextRequest, { params }: Params) {
```

Two things to notice:

1. `_req` -- the underscore prefix is a convention meaning "I am required to accept this parameter, but I am not going to use it." Next.js passes the request as the first argument and params as the second. You cannot skip the first argument to get to the second, so you accept it and name it with an underscore to signal it is unused.

2. `{ params }: Params` -- destructures the second argument to pull out `params` directly.

```typescript
  const customer = mockCustomers.find((item) => item.id === params.id);
```

Searches the mock array for a customer whose `id` matches the URL parameter. `.find()` returns the first match, or `undefined` if none is found.

```typescript
  if (!customer) {
    return NextResponse.json(fail("NOT_FOUND", "Customer not found."), { status: 404 });
  }
```

If no customer was found, return a 404 (Not Found) error using the envelope's `fail` helper. This is a critical pattern -- always check whether the resource exists before trying to use it.

```typescript
  return NextResponse.json(ok(customer));
}
```

If found, return the customer wrapped in a success envelope. The default HTTP status is 200.

### PATCH handler -- Partial update

```typescript
export async function PATCH(req: NextRequest, { params }: Params) {
  const customer = mockCustomers.find((item) => item.id === params.id);
  if (!customer) {
    return NextResponse.json(fail("NOT_FOUND", "Customer not found."), { status: 404 });
  }
```

Same lookup-and-404 pattern as GET. This is duplicated code, which is not ideal. In a larger codebase, you might extract a `findCustomerOrFail` helper. But for a small project, the duplication is tolerable and keeps each handler self-contained.

```typescript
  const body = await req.json().catch(() => null);
```

This parses the request body as JSON. The `.catch(() => null)` is important: if the body is missing or is not valid JSON (say, someone sent plain text), `req.json()` would throw an error. The `.catch` turns that error into a `null` so the code does not crash.

This is a **defensive parsing** pattern. You never trust that the client sent well-formed data.

```typescript
  const parseResult = patchSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", parseResult.error.message), { status: 400 });
  }
```

Same Zod validation pattern as the list route. If `body` is `null` (because parsing failed), `safeParse(null)` will fail because `null` is not an object -- so invalid JSON and invalid data are both caught here.

```typescript
  Object.assign(customer, parseResult.data);
```

This is where the update happens. `Object.assign(target, source)` copies all properties from `source` onto `target`. Since `parseResult.data` only contains the fields the caller sent (and Zod has validated them), this overwrites only those specific fields on the customer object.

**Honesty note:** This mutates the mock data array in memory. That means:

- The change persists until the server restarts.
- There is no real database involved.
- In production, you would run an `UPDATE` SQL query or equivalent, not mutate an in-memory object.
- Mutating shared state like this is not thread-safe, but Node.js is single-threaded, so it works for a mock.

```typescript
  return NextResponse.json(ok(customer));
}
```

Returns the updated customer. The front end can use this to update its local state without making a separate GET request.

---

## Concepts taught

| Concept | What you just saw |
|---|---|
| **Dynamic route segments** | `[id]` in the folder name extracts a URL parameter. |
| **Params typing** | Manually defining `type Params` for the second handler argument. |
| **Unused parameter convention** | Prefixing with `_` to show a parameter is intentionally unused. |
| **Resource lookup + 404** | Always check if the item exists before operating on it. |
| **Defensive JSON parsing** | `.catch(() => null)` prevents crashes from malformed request bodies. |
| **Partial updates (PATCH semantics)** | Only the sent fields are changed; everything else stays the same. |
| **`Object.assign` for mutation** | Copies validated fields onto the existing object. |
| **GET vs PATCH in one file** | Multiple HTTP methods can coexist in a single `route.ts`. |

---

## Common mistakes

1. **Forgetting the 404 check.** If you skip the `if (!customer)` guard and go straight to `return NextResponse.json(ok(customer))`, you will return `{ success: true, data: undefined }` -- which is technically a 200 success with no data. The front end will be confused.

2. **Using PUT when you mean PATCH.** `PUT` means "replace the entire resource." `PATCH` means "update only the fields I am sending." If you use PUT semantics but only send `{ status: "churned" }`, you would erase every other field on the customer. PATCH is almost always what you want for partial updates.

3. **Not catching `req.json()` failures.** If the client sends a request with no body, or with `Content-Type: text/plain`, `req.json()` throws. Without the `.catch`, your handler crashes with a 500 Internal Server Error instead of a clean 400.

4. **Trusting `Object.assign` with unvalidated data.** If you did `Object.assign(customer, body)` without Zod validation, a malicious client could send `{ "id": "hacked", "role": "admin" }` and overwrite fields they should not touch. Always validate first.

5. **Forgetting that `params.id` is always a string.** Even if your IDs look like numbers (`/api/customers/42`), the URL parameter is the string `"42"`, not the number `42`. If your data uses numeric IDs, you need to convert with `Number(params.id)` or `parseInt(params.id, 10)`.

---

## Mini exercises

### Exercise 1 -- Add a DELETE handler

Add a `DELETE` function to this route file that removes a customer from the mock array. Return the deleted customer in the response, or 404 if the ID does not exist. Think about what array method you need (hint: `.findIndex()` and `.splice()`).

<details>
<summary>Hint</summary>

```typescript
export async function DELETE(_req: NextRequest, { params }: Params) {
  const index = mockCustomers.findIndex((item) => item.id === params.id);
  if (index === -1) {
    return NextResponse.json(fail("NOT_FOUND", "Customer not found."), { status: 404 });
  }
  const [deleted] = mockCustomers.splice(index, 1);
  return NextResponse.json(ok(deleted));
}
```

Note: this mutates the mock array, so the customer is gone until you restart the server.

</details>

### Exercise 2 -- Test the PATCH with curl

Start the dev server and find a valid customer ID (fetch the list first). Then run:

```bash
curl -X PATCH http://localhost:3000/api/customers/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "churned"}'
```

Then fetch the same customer with GET and confirm the status changed. Now try sending an invalid status:

```bash
curl -X PATCH http://localhost:3000/api/customers/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "deleted"}'
```

What does the error response look like?

### Exercise 3 -- Extract the lookup logic

The "find customer or return 404" pattern is duplicated between GET and PATCH. Write a helper function called `findCustomerOr404` that takes `params.id` and returns either the customer object or a `NextResponse` with a 404. Then refactor both handlers to use it.

<details>
<summary>Hint</summary>

One approach:

```typescript
function findCustomerOr404(id: string) {
  const customer = mockCustomers.find((item) => item.id === id);
  if (!customer) {
    return { found: false as const, response: NextResponse.json(fail("NOT_FOUND", "Customer not found."), { status: 404 }) };
  }
  return { found: true as const, customer };
}
```

Then in the handler:

```typescript
const result = findCustomerOr404(params.id);
if (!result.found) return result.response;
const customer = result.customer;
```

This uses a discriminated union (just like the envelope pattern) to let TypeScript narrow the type.

</details>

---

## Further reading

- **Next.js dynamic routes:** https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- **HTTP PATCH vs PUT:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/PATCH
- **Object.assign MDN docs:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
- **Zod `.safeParse()` vs `.parse()`:** https://zod.dev/?id=safeparse
- **REST API design: handling 404s:** Search for "REST API 404 vs empty response" -- there is a healthy debate about when to use 404 vs returning `null` with a 200.
