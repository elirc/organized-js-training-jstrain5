# Guide: Dashboard API Routes (KPIs and Health)

**Files covered:**
- `src/app/api/dashboard/kpis/route.ts`
- `src/app/api/dashboard/health/route.ts`

---

## Purpose

These two files are the simplest "real" API routes in the project. Each one does exactly one thing: return mock data wrapped in the standard response envelope. There is no filtering, no pagination, no validation, no authentication check. They exist to feed the dashboard UI with data it can render immediately.

They are worth studying because they show the **minimum viable API route** in this codebase. Once you understand these, everything more complex (like the customers route) is just adding layers on top of this same skeleton.

---

## Line-by-line walkthrough

### KPIs route (`src/app/api/dashboard/kpis/route.ts`)

```typescript
import { NextResponse } from "next/server";
```

`NextResponse` is the Next.js class for building HTTP responses. Its `.json()` method takes a JavaScript object, serializes it to JSON, and sets the `Content-Type: application/json` header automatically.

```typescript
import { dashboardKpis } from "@/lib/mock/dashboard";
```

This imports a pre-built data object from a mock file. The mock file likely contains hard-coded numbers -- things like total revenue, active users, churn rate -- so the dashboard has something to display before a real database is connected.

```typescript
import { ok } from "@/lib/http/envelope";
```

The `ok` helper from the envelope module. It wraps whatever you pass it in `{ success: true, data: <your stuff> }`.

```typescript
export async function GET() {
  return NextResponse.json(ok(dashboardKpis));
}
```

This is the entire handler. Breaking it down from the inside out:

1. `dashboardKpis` -- the raw mock data.
2. `ok(dashboardKpis)` -- wraps it: `{ success: true, data: dashboardKpis }`.
3. `NextResponse.json(...)` -- serializes to JSON and returns a proper HTTP response with status 200.

The function is `async` even though nothing inside it uses `await`. This is fine -- Next.js expects route handlers to return a `Response` or a `Promise<Response>`, and `async` functions always return a promise. It also future-proofs the function for when you replace the mock with a real database call that *will* need `await`.

The function is named `GET` because Next.js App Router looks for exports named after HTTP methods. A request like `GET /api/dashboard/kpis` is routed to this function.

### Health route (`src/app/api/dashboard/health/route.ts`)

```typescript
import { NextResponse } from "next/server";
import { systemHealthRows } from "@/lib/mock/dashboard";
import { ok } from "@/lib/http/envelope";

export async function GET() {
  return NextResponse.json(ok(systemHealthRows));
}
```

Structurally identical. The only difference is the data source: `systemHealthRows` instead of `dashboardKpis`. This probably contains an array of objects representing the health status of various services or subsystems (database, cache, queue, etc.).

The pattern is: **one route file, one data source, one HTTP method, one envelope call.** That is the template.

---

## Concepts taught

| Concept | What you just saw |
|---|---|
| **Minimal route handler** | The simplest shape: import data, wrap in envelope, return JSON. |
| **`NextResponse.json()`** | How to return a JSON HTTP response in the App Router. |
| **Mock data layer** | Importing from `@/lib/mock/...` so the API works before a database exists. |
| **Envelope consistency** | Even trivial endpoints use `ok()` so every response has the same shape. |
| **`async` without `await`** | A harmless pattern that keeps the function signature ready for future async work. |
| **File-system routing** | The file path `app/api/dashboard/kpis/route.ts` creates the URL `/api/dashboard/kpis`. |

---

## Common mistakes

1. **Forgetting the envelope.** It is tempting to write `NextResponse.json(dashboardKpis)` directly. The data will arrive at the front end, but it will be missing the `{ success, data }` wrapper, and any shared error-handling code on the client will break.

2. **Returning the data without `NextResponse.json()`.** If you write `return ok(dashboardKpis)`, you are returning a plain object, not an HTTP `Response`. Next.js will throw a runtime error because route handlers must return a `Response` instance.

3. **Adding query parameters to a route that does not need them.** These dashboard routes return all their data every time. There is no filtering. Do not add complexity until you actually need it.

4. **Naming the function lowercase `get` instead of uppercase `GET`.** Next.js looks for the exact names `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. A lowercase `get` will be ignored, and requests will return 405 Method Not Allowed.

---

## Mini exercises

### Exercise 1 -- Add a new dashboard route

Create a new file at `src/app/api/dashboard/alerts/route.ts` that returns a mock array of alert objects. Each alert should have an `id`, a `severity` (like `"info"`, `"warning"`, `"critical"`), and a `message`. Follow the exact same pattern as the KPIs and Health routes.

<details>
<summary>Hint</summary>

1. Create a mock data array in `src/lib/mock/dashboard.ts` (or a new file).
2. Import it in your new route.
3. Wrap it with `ok()` and return it with `NextResponse.json()`.

The whole route handler should be about 5 lines.

</details>

### Exercise 2 -- Test with curl

Start the dev server and run these commands in your terminal:

```bash
curl http://localhost:3000/api/dashboard/kpis
curl http://localhost:3000/api/dashboard/health
```

Inspect the JSON output. Confirm that both responses have `"success": true` at the top level. Then try:

```bash
curl -X POST http://localhost:3000/api/dashboard/kpis
```

What happens when you send a POST to a route that only exports GET?

<details>
<summary>Answer</summary>

Next.js returns a `405 Method Not Allowed` response automatically. You do not need to handle unsupported methods yourself -- the framework does it because only `GET` is exported.

</details>

### Exercise 3 -- Trace the mock data

Open `src/lib/mock/dashboard.ts` and look at the shape of `dashboardKpis`. Write down its type (or the TypeScript type annotation if one exists). Then open the front-end component that fetches `/api/dashboard/kpis` and see how it uses that data. Does the front-end type match the API type?

---

## Further reading

- **Next.js Route Handlers:** https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **NextResponse API reference:** https://nextjs.org/docs/app/api-reference/functions/next-response
- **Mocking data in early development** (general practice): search for "mock data layer API development" -- this is a universal pattern, not specific to any framework.
