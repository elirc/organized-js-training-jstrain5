# Chapter 5 — The API Layer: One Contract, Every Endpoint

> **Mental model:** an API is a *contract*, not a pile of URLs. In this repo the contract has
> two clauses: every response is wrapped in the same envelope shape, and every input is
> validated with Zod before any logic runs. If you internalize those two clauses, you can
> write — or review — any endpoint in this codebase.

## How routing works (60 seconds)

In Next.js App Router, a file called `route.ts` inside `src/app/api/…` *is* an endpoint. Its
folder path is the URL; its exported function names are the HTTP methods:

```
src/app/api/customers/route.ts        →  GET/POST   /api/customers
src/app/api/customers/[id]/route.ts   →  GET/PATCH  /api/customers/:id     ([id] = dynamic param)
src/app/api/auth/[...nextauth]/route.ts →  anything under /api/auth/*      ([...x] = catch-all)
```

Export `GET` and you handle GETs; don't export `DELETE` and Next.js answers DELETEs with an
automatic 405. No router file, no registration list — the file tree is the routing table.
You saw the same idea for pages in [Chapter 1](01-big-picture.md).

## The envelope: the repo's most important 22 lines

[`src/lib/http/envelope.ts`](../src/lib/http/envelope.ts), in full:

```typescript
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}
```

**The problem it solves.** Without a convention, every endpoint invents its own shapes:
one returns raw arrays, another `{ error: "..." }` with HTTP 200, a third throws HTML error
pages. Frontend code becomes a museum of special cases, and the classic junior bug appears:
`data.items is undefined` — because *this particular* endpoint signals errors differently
than the one you copied from. The envelope kills the entire category: the frontend checks
`response.success` and always knows where to look.

**Why it's a discriminated union.** `success` is the *discriminant*: TypeScript narrows the
type when you check it.

```typescript
const res: ApiResponse<Customer[]> = await fetchCustomers();
if (res.success) {
  res.data;    // ✅ TypeScript knows data exists here
  res.error;   // ❌ compile error — error doesn't exist on the success branch
}
```

The impossible states (`success: true` *and* an `error`) aren't just discouraged — they are
*unrepresentable*. Making bad states unrepresentable is one of the deepest ideas in typed
programming, and this tiny file is the cleanest example in the repo.

**Why `code` and `message` both exist:** `message` is for humans; `code`
(`"VALIDATION_ERROR"`, `"NOT_FOUND"`, `"NOT_IMPLEMENTED"`) is for machines — frontend logic
branches on codes, never on message text, because messages get reworded.

The smallest real route shows the pattern's floor —
[`src/app/api/dashboard/kpis/route.ts`](../src/app/api/dashboard/kpis/route.ts) is seven
lines: `return NextResponse.json(ok(dashboardKpis));`. Even a trivial route pays the
envelope tax, *because the contract only works if it has no exceptions*.

## The route worth studying: `GET /api/customers`

[`src/app/api/customers/route.ts`](../src/app/api/customers/route.ts) is the most complete
endpoint in the repo — validation, filtering, and pagination in ~60 lines. Annotated:

**1. Declare what valid input looks like:**

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

Read `limit`'s chain like a sentence: *coerce* the string `"25"` from the URL into a number
(query params are always strings!), require an integer, between 1 and 100, defaulting to
25. The `max(100)` is not pedantry — without it, `?limit=999999` lets any caller turn your
endpoint into a denial-of-service tool against yourself. And the enums mirror the database
enums from [Chapter 3](03-data-layer.md): the same truth, restated at the boundary.

**2. Validate at the boundary, then never again:**

```typescript
const parseResult = querySchema.safeParse({ /* raw query params */ });
if (!parseResult.success) {
  return NextResponse.json(fail("VALIDATION_ERROR", parseResult.error.message), { status: 400 });
}
const { search, plan, status, region, cursor, limit } = parseResult.data;
```

`safeParse` returns a result object instead of throwing — which fits the guard-clause style
you saw in [Chapter 4](04-authentication.md): handle failure first, return early. After
this line, *everything downstream can trust the data completely*. That's the payoff of
validating at the edge: no defensive re-checking (`is limit really a number?`) scattered
through business logic. Boundaries validate; interiors trust.

**3. Filter (one pass, early-exit per condition):**

```typescript
let rows = mockCustomers.filter((customer) => {
  if (search && !customer.companyName.toLowerCase().includes(search.toLowerCase())) return false;
  if (plan && customer.plan !== plan) return false;
  if (status && customer.status !== status) return false;
  if (region && customer.region !== region) return false;
  return true;   // survived every active filter
});
```

Each `if (param && …)` means "if this filter was provided, apply it" — unset filters cost
nothing. This shape translates almost 1:1 into the SQL `WHERE` clauses that will replace it.

**4. Cursor pagination:**

```typescript
rows = rows.sort((a, b) => a.id.localeCompare(b.id));   // stable order is REQUIRED

const startIndex = cursor ? rows.findIndex((item) => item.id === cursor) + 1 : 0;
const page = rows.slice(startIndex, startIndex + limit);
const nextCursor = page.length === limit ? page[page.length - 1]?.id : null;
```

Why cursors instead of `?page=3`? Offset pagination breaks when data changes between
requests: someone inserts a customer while you're on page 2, and page 3 shows you a
duplicate (or skips a row) because every row shifted. A cursor says "give me what comes
*after* cus_025" — insertions elsewhere can't shift your window. The `nextCursor` logic:
if we filled the page, there's probably more (hand back the last ID as the bookmark);
a short page means we hit the end (`null` = stop asking). Stripe, GitHub, and Slack APIs
all paginate this way; you're learning the industry pattern from a 5-line version.

## The detail route — and a real anti-pattern

[`src/app/api/customers/[id]/route.ts`](../src/app/api/customers/[id]/route.ts) adds two
things. First, dynamic params: the `[id]` folder delivers `params.id` to the handler, which
looks up the row and returns `fail("NOT_FOUND", …)` with 404 when it's missing. Second, a
PATCH handler that validates a *partial* update (both fields optional) — and then does this:

```typescript
Object.assign(customer, parseResult.data);   // ⚠️ mutates the in-memory mock
```

Understand exactly why this is acceptable *here* and unacceptable in production: it mutates
a module-level array, so the "update" survives only until restart, and concurrent requests
race on shared state. It's a placeholder for a database `UPDATE`. Spotting this kind of
code — *fine as scaffolding, dangerous if it ships* — is precisely the judgment
[Chapter 1](01-big-picture.md)'s scaffolding section asked you to build. Note also
`await req.json().catch(() => null)`: malformed JSON becomes `null`, which then fails Zod
validation. Pragmatic, though it mislabels "unparseable body" as a validation error — a
production version would return a distinct `INVALID_JSON` code.

## Two special route shapes

**The catch-all:** [`src/app/api/auth/[...nextauth]/route.ts`](../src/app/api/auth/[...nextauth]/route.ts)
is two lines — `export const { GET, POST } = handlers;` — delegating every `/api/auth/*`
URL to NextAuth ([Chapter 4](04-authentication.md), Stop 5).

**The stream:** [`src/app/api/events/stream/route.ts`](../src/app/api/events/stream/route.ts)
returns `text/event-stream` — **Server-Sent Events**, a one-way channel where the server
pushes messages to the browser over one long-lived response (here: a heartbeat every 5s,
closing after 30s). It's how the dashboard would receive live incident updates without
polling. Note it returns a raw `Response` with a `ReadableStream` body — the one place the
envelope doesn't apply, because SSE has its own wire format (`data: …\n\n`).

And the other ~40 route files? All 501 stubs — the scaffolding story told once in
[Chapter 1](01-big-picture.md), honored here by every stub still returning
`fail("NOT_IMPLEMENTED", …)` through the envelope.

## Common junior mistakes

- **Returning errors with HTTP 200.** `NextResponse.json(fail(...))` without
  `{ status: 400 }` sends a "successful" error. Monitoring dashboards, browser devtools,
  and retry logic all key off status codes; a 200 error is invisible to all of them. The
  envelope's `success` field *complements* status codes, never replaces them.
- **Validating with `if` statements instead of a schema.** Hand-rolled checks drift, miss
  cases (`limit=-5`?), and don't produce machine-readable error messages. One Zod schema is
  the single place where "valid" is defined.
- **Trusting query params to be numbers.** They are always strings. Without `z.coerce`,
  `limit` arrives as `"25"` and `"25" < 100` does string comparison somewhere and you lose
  an afternoon. This exact bug is why `coerce` exists.
- **Copy-pasting a route and editing it** instead of noticing what should be shared. If you
  find yourself pasting the Zod-parse-and-fail block a fifth time, the codebase is telling
  you to extract a helper. Copy-paste is how contracts drift.
- **Skipping pagination "because the list is small."** Lists only grow. An endpoint that
  returns everything works in the demo and times out in month six. Cursor + limit from day
  one costs ten lines.

## Try it yourself

1. **Poke the contract with curl** (app running, in another terminal):
   ```bash
   curl "http://localhost:3000/api/customers?limit=2"
   curl "http://localhost:3000/api/customers?limit=999"      # watch Zod reject it
   curl "http://localhost:3000/api/customers?plan=platinum"  # enum rejection
   curl "http://localhost:3000/api/billing/invoices"          # a 501 stub, in the envelope
   ```
   For each, note the HTTP status *and* the envelope body. Two channels, one story.
2. **Walk the cursor.** Request `?limit=2`, take `pagination.cursor` from the response, and
   pass it back as `?limit=2&cursor=…`. Repeat until `hasMore` is false. You've manually
   done what a frontend's "load more" button does.
3. **Break the sort, break the pagination.** Comment out the `rows.sort(…)` line in the
   customers route and re-run exercise 2. Depending on filter combinations, pages can now
   overlap or skip. This is why "stable order is REQUIRED" — cursors are meaningless
   without deterministic ordering. Revert.
4. **Implement one stub.** Pick `src/app/api/reports/route.ts`, implement just `GET` to
   return a hardcoded list through `ok(…)`, keep the other methods as 501. You've just done
   a unit of real feature work exactly the way this codebase intends it to be done.

## Ask your agent

> "Implement GET /api/incidents in this repo following the exact pattern of
> src/app/api/customers/route.ts: Zod query validation (filter by severity and status —
> check the schema enums), envelope responses, cursor pagination. Return mock data shaped
> like the incidents table in src/lib/db/schema.ts."

Review the diff with this chapter as the checklist: schema validated with `safeParse` +
400? Enums matching `schema.ts`? Stable sort before cursor logic? Every response
enveloped? Correct status on every branch? Pointing an agent at a *reference file* ("follow
the exact pattern of X") is the single most effective prompting move in this codebase —
[Chapter 9](09-ai-assisted-engineering.md) explains why.

---

**You can now:** read any route in the repo in one pass, write a new endpoint that honors
both contract clauses, explain cursor pagination and why error responses need real status
codes, and recognize scaffolding-only shortcuts in API code.

**Next:** [Chapter 6 — The UI Layer](06-ui-layer.md): server vs. client components, and how
the app shell is assembled.
