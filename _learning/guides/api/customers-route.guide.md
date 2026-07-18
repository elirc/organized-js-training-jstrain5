# Guide: Customers List Route (Filtering, Validation, Cursor Pagination)

**File covered:** `src/app/api/customers/route.ts`

---

## Purpose

This is the most feature-rich API route you have seen so far in this project. It handles listing customers with:

- **Input validation** using Zod
- **Filtering** by search text, plan, status, and region
- **Cursor-based pagination** for efficient page-by-page data loading
- **A stub POST handler** that returns "not implemented"

It is the route to study when you want to understand how a real-world list endpoint is built.

---

## Line-by-line walkthrough

### Imports

```typescript
import { NextRequest, NextResponse } from "next/server";
```

Two classes from Next.js. `NextRequest` extends the standard `Request` with convenience methods like `.nextUrl` (which gives you a parsed URL object with easy access to query parameters). `NextResponse` is used to build the JSON response.

```typescript
import { z } from "zod";
```

Zod is a **runtime validation library**. TypeScript types disappear when your code compiles to JavaScript -- they protect you at development time but not at runtime. Zod fills that gap: it checks incoming data at runtime and tells you exactly what is wrong if something does not match.

```typescript
import { fail, ok } from "@/lib/http/envelope";
```

The standard envelope helpers. You know these from the envelope guide.

```typescript
import { mockCustomers } from "@/lib/mock/customers";
```

The mock data array. In a real app, this would be a database query.

### The validation schema

```typescript
const querySchema = z.object({
  search: z.string().optional(),
  plan: z.enum(["free", "starter", "business", "enterprise"]).optional(),
  status: z.enum(["active", "suspended", "churned"]).optional(),
  region: z.enum(["us-east", "us-west", "eu-west", "ap-south"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
```

This is a Zod **schema**. It describes the shape of the query parameters this endpoint accepts.

- `z.string().optional()` -- accepts a string or `undefined`. If the caller does not send a `search` param, that is fine.
- `z.enum([...]).optional()` -- accepts one of the listed strings, or `undefined`. If someone sends `plan=gold`, Zod will reject it because `"gold"` is not in the list.
- `z.coerce.number()` -- this is important. Query parameters arrive as **strings** (because URLs are text). `.coerce` tells Zod to convert the string `"25"` into the number `25` before validating. Without `.coerce`, the string `"25"` would fail a number check.
- `.int().min(1).max(100)` -- must be a whole number between 1 and 100.
- `.default(25)` -- if `limit` is not provided, use `25`.

The schema is defined **outside** the handler function. This means it is created once when the module loads, not on every request. Minor optimization, but good habit.

### Extracting query parameters

```typescript
export async function GET(req: NextRequest) {
  const parseResult = querySchema.safeParse({
    search: req.nextUrl.searchParams.get("search") ?? undefined,
    plan: req.nextUrl.searchParams.get("plan") ?? undefined,
    status: req.nextUrl.searchParams.get("status") ?? undefined,
    region: req.nextUrl.searchParams.get("region") ?? undefined,
    cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });
```

`req.nextUrl.searchParams` is a `URLSearchParams` object. `.get("search")` returns the value of the `?search=...` query parameter, or `null` if it is missing.

The `?? undefined` converts `null` to `undefined`. Why? Because Zod's `.optional()` expects `undefined`, not `null`. Without this conversion, Zod would see `null` and reject it as an invalid value. This is a common gotcha when bridging browser/URL APIs (which use `null` for "missing") with Zod (which uses `undefined` for "missing").

`.safeParse()` validates the object and returns either `{ success: true, data: {...} }` or `{ success: false, error: ZodError }`. The "safe" part means it does **not** throw an exception on failure -- it returns a result object you can inspect. Compare this with `.parse()`, which throws.

### Handling validation failure

```typescript
  if (!parseResult.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", parseResult.error.message), { status: 400 });
  }
```

If validation fails, the route returns an error envelope with HTTP status 400 (Bad Request). The `parseResult.error.message` contains Zod's description of what went wrong, like `"Expected 'free' | 'starter' | 'business' | 'enterprise', received 'gold'"`.

### Destructuring validated data

```typescript
  const { search, plan, status, region, cursor, limit } = parseResult.data;
```

After validation, `parseResult.data` is fully typed. TypeScript knows `plan` is `"free" | "starter" | "business" | "enterprise" | undefined`, `limit` is `number` (never undefined because of `.default(25)`), and so on. You get this type safety for free because Zod infers types from the schema.

### Filtering

```typescript
  let rows = mockCustomers.filter((customer) => {
    if (search && !customer.companyName.toLowerCase().includes(search.toLowerCase())) return false;
    if (plan && customer.plan !== plan) return false;
    if (status && customer.status !== status) return false;
    if (region && customer.region !== region) return false;
    return true;
  });
```

This is a **chain of filter conditions**. The callback returns `false` to exclude a customer and `true` to include it. Each `if` checks whether the filter parameter was provided (`search`, `plan`, etc. are `undefined` if the caller did not send them) and then whether the customer matches.

The pattern `if (param && !match) return false` means: "if the caller asked to filter on this field, and this customer does not match, exclude it." If the caller did not ask to filter, the check is skipped entirely.

The `search` filter uses `.toLowerCase()` on both sides for case-insensitive matching. The others are exact matches.

Honesty note: this filtering approach works fine for mock data (a small in-memory array), but in production you would push these filters into a database query (`WHERE` clauses) instead of loading all rows and filtering in JavaScript.

### Sorting

```typescript
  rows = rows.sort((a, b) => a.id.localeCompare(b.id));
```

Sorts by `id` alphabetically. This is necessary for cursor pagination to work correctly -- the order must be **deterministic** (the same every time). If you sort randomly, the cursor will point to the wrong place on the next request.

### Cursor-based pagination

```typescript
  const startIndex = cursor ? rows.findIndex((item) => item.id === cursor) + 1 : 0;
  const page = rows.slice(startIndex, startIndex + limit);
  const nextCursor = page.length === limit ? page[page.length - 1]?.id : null;
```

This is the heart of cursor pagination. Here is how it works:

1. **If no cursor was sent**, start from index 0 (the beginning).
2. **If a cursor was sent**, find the item whose `id` matches the cursor, and start from the **next** item (`+ 1`). The cursor essentially says "I already saw everything up to and including this ID; give me what comes after."
3. **Slice** the array to get `limit` items starting from `startIndex`.
4. **Calculate the next cursor.** If the page is "full" (has exactly `limit` items), there *might* be more data, so the next cursor is the ID of the last item on this page. If the page is smaller than `limit`, we have reached the end, so `nextCursor` is `null`.

Why cursor pagination instead of page numbers (offset pagination)?

- **Offset pagination** (`?page=3&limit=25`) breaks when data is added or removed between requests. If a new customer is inserted before page 3, everything shifts and you either miss an item or see a duplicate.
- **Cursor pagination** does not have this problem because it anchors to a specific item, not a numeric position.

### Building the response

```typescript
  return NextResponse.json(
    ok({
      items: page,
      pagination: { cursor: nextCursor, limit, hasMore: Boolean(nextCursor) },
    }),
  );
}
```

The response envelope wraps an object with two keys:

- `items` -- the actual array of customers for this page.
- `pagination` -- metadata the front end needs to fetch the next page: the `cursor` to send back, the `limit` that was used, and a `hasMore` boolean for convenience.

`Boolean(nextCursor)` converts `null` to `false` and any string to `true`.

### The stub POST handler

```typescript
export async function POST() {
  return NextResponse.json(fail("NOT_IMPLEMENTED", "Customer creation is not implemented yet."), { status: 501 });
}
```

This is a placeholder. It tells the caller "yes, this endpoint will eventually support creating customers, but it does not yet." The 501 status code means "Not Implemented." This is better than omitting it entirely (which would return 405 Method Not Allowed) because 501 communicates intent: the feature is planned but not built.

---

## Concepts taught

| Concept | What you just saw |
|---|---|
| **Runtime validation with Zod** | `safeParse` validates incoming data and gives typed results. |
| **`z.coerce`** | Converts strings to the target type (critical for URL query params). |
| **`null` vs `undefined` bridging** | `?? undefined` to convert `null` from URL APIs to `undefined` for Zod. |
| **In-memory filtering** | `.filter()` with a multi-condition callback. |
| **Cursor-based pagination** | Using an item ID as a bookmark instead of a page number. |
| **Deterministic sorting** | Required for stable cursor pagination. |
| **Stub endpoints (501)** | Signaling "planned but not built" to API consumers. |
| **Schema outside handler** | Defining the schema at module scope for efficiency and clarity. |

---

## Common mistakes

1. **Forgetting `z.coerce` for query parameters.** Without it, `limit=25` arrives as the string `"25"`, and `z.number()` rejects it. You will get a confusing validation error.

2. **Not handling `null` from `searchParams.get()`.** If you pass `null` to an `.optional()` Zod field, it fails validation because Zod treats `null` and `undefined` differently.

3. **Using `.parse()` instead of `.safeParse()`.** `.parse()` throws an exception on failure. If you do not wrap it in a try/catch, your route handler crashes with a 500 error instead of returning a clean 400 with an error message.

4. **Forgetting to sort before cursor pagination.** If the order of items changes between requests, the cursor points to the wrong item, and users see duplicates or missing records.

5. **Assuming `findIndex` always succeeds.** If someone sends a cursor ID that does not exist in the data (maybe it was deleted), `findIndex` returns `-1`, and `-1 + 1 = 0`, which means pagination silently starts from the beginning. This is arguably a bug in this code -- a production version should probably return an error.

---

## Mini exercises

### Exercise 1 -- Add a `sortBy` parameter

Extend the `querySchema` to accept a `sortBy` query parameter that can be `"companyName"` or `"id"` (default `"id"`). Then update the sorting logic to use the chosen field. Remember to handle the fact that `companyName` might contain mixed case.

<details>
<summary>Hint</summary>

Add `sortBy: z.enum(["id", "companyName"]).default("id")` to the schema. Then in the sort comparator, use `a[sortBy].localeCompare(b[sortBy])` -- but be careful with `companyName` case. You may want `.toLowerCase()` on both sides.

</details>

### Exercise 2 -- Test the cursor flow manually

Start the dev server. Use curl (or your browser) to:

1. Fetch `/api/customers?limit=3`. Note the `cursor` value in the response.
2. Fetch `/api/customers?limit=3&cursor=<that cursor value>`. Note the next cursor.
3. Keep going until `hasMore` is `false`.

Count how many total customers you fetched across all pages. Then fetch `/api/customers?limit=100` and count the items. Do the totals match?

### Exercise 3 -- Break the pagination on purpose

Change the sort to `rows.sort(() => Math.random() - 0.5)` (random order). Then try the cursor flow from Exercise 2 again. What happens? Do you see duplicates? Missing items? This demonstrates why deterministic sorting matters.

<details>
<summary>What to expect</summary>

With random sorting, the same customer can appear on multiple pages or be skipped entirely. The cursor points to an ID, but that ID is in a different position every time the array is re-sorted, so "start after this ID" becomes meaningless.

</details>

---

## Further reading

- **Zod documentation:** https://zod.dev
- **Cursor-based pagination explained** (Slack engineering blog): search for "Slack evolving API pagination" -- it is one of the clearest explanations of why cursors beat offsets.
- **Next.js Route Handler request object:** https://nextjs.org/docs/app/api-reference/functions/next-request
- **URLSearchParams MDN docs:** https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
- **HTTP 400 vs 422:** A common debate -- this project uses 400 for validation errors, but some teams prefer 422 (Unprocessable Entity). Worth reading about both.
