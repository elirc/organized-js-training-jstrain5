# Guide: Scaffolded (Stub) Routes

**Pattern covered:** ~40 API route files that return 501 Not Implemented for all methods.

**Example file:** Any of the stub `route.ts` files throughout `src/app/api/`

---

## Purpose

You will notice that this project has dozens of API route files that all look nearly identical and do not do anything useful. They exist as **scaffolding** -- a deliberate plan laid out before the implementation begins.

Think of it like framing a house. The frame goes up before the walls, plumbing, and wiring. You can walk through the frame and see where every room will be, even though you cannot live in it yet. These stub routes are the frame of the API.

The full pattern:

```typescript
import { NextResponse } from "next/server";
import { fail } from "@/lib/http/envelope";

export async function GET() {
  return NextResponse.json(
    fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."),
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."),
    { status: 501 },
  );
}

export async function PATCH() {
  return NextResponse.json(
    fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."),
    { status: 501 },
  );
}

export async function PUT() {
  return NextResponse.json(
    fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."),
    { status: 501 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."),
    { status: 501 },
  );
}
```

---

## Line-by-line walkthrough

The individual lines are simple -- you have seen `NextResponse.json`, `fail`, and envelope patterns in earlier guides. What matters here is **why** this pattern exists and what each design decision communicates.

### Why 501 and not 404?

HTTP status codes have specific meanings:

- **404 Not Found** -- "This URL does not exist." The client made a mistake in the address.
- **405 Method Not Allowed** -- "This URL exists, but you used the wrong HTTP method." (Next.js returns this automatically if you try a method that is not exported.)
- **501 Not Implemented** -- "The server understands what you are asking for, but it has not been built yet."

501 is the honest choice here. The endpoint **does** exist at this URL. The server **does** recognize the request. It just cannot fulfill it yet. Using 501 tells API consumers (front-end developers, automated tests, monitoring tools): "this is coming, do not file a bug report, it is a known gap."

### Why export all five HTTP methods?

If you only export `GET`, then a POST request to the same URL returns **405 Method Not Allowed** (Next.js does this automatically). That 405 suggests the method is wrong -- that the client should not be sending POSTs here. But the plan *is* to accept POSTs eventually.

By exporting all five methods and returning 501 from each, the route communicates: "I will handle GET, POST, PATCH, PUT, and DELETE someday. Right now, none of them work." This is a subtle but important distinction when you are building a front end and back end in parallel. The front-end developer can see exactly which methods are planned and can write their fetch calls accordingly, knowing the API will catch up.

### Why use the `fail` envelope instead of a plain message?

Consistency. The front-end code expects every response to have the shape `{ success: true, data: ... }` or `{ success: false, error: { code, message } }`. If a stub returned a plain string like `"Not implemented"`, the front-end error handling code would break because it cannot find `response.error.code`.

By using `fail("NOT_IMPLEMENTED", "...")`, even the stubs conform to the API contract. A front-end component that calls a stub endpoint will cleanly display an error message instead of crashing.

### Why scaffold at all? Why not add routes as you build them?

Several reasons:

1. **API design up front.** By laying out every route before writing logic, you force yourself to think about the full shape of the API. What resources exist? What operations does each support? This catches design problems early -- before you have written hundreds of lines of implementation code.

2. **Front-end development can proceed.** If the front end knows the URL and the expected response shape, it can be built with mock data and swapped to the real endpoint when it is ready. The 501 stubs make it obvious which endpoints are not ready.

3. **Discoverability.** A new developer joining the project can look at the file tree and immediately see every planned API endpoint. Compare this to a project where endpoints are added ad hoc -- you would have to read documentation (if it exists) to know what is planned.

4. **Testing infrastructure.** You can write integration tests that call every endpoint and assert "this one returns 200, this one still returns 501." As implementation progresses, the 501 tests are replaced with real assertions. You can even track implementation progress as a percentage.

---

## Concepts taught

| Concept | What you just saw |
|---|---|
| **HTTP 501 Not Implemented** | A specific status code meaning "the server knows what you want but cannot do it yet." |
| **Scaffolding / stubs** | Placeholder code that defines structure without behavior. |
| **API-first design** | Designing the API surface (URLs, methods, response shapes) before writing implementation logic. |
| **Contract consistency** | Even stubs use the standard envelope, keeping the API contract uniform. |
| **405 vs 501** | Why exporting all methods with 501 is more informative than letting Next.js return 405. |
| **Progressive implementation** | A strategy where you build the frame first and fill in the details over time. |

---

## Common mistakes

1. **Using 404 for unimplemented routes.** This confuses "the URL is wrong" with "the feature is not built yet." A front-end developer will waste time checking their URL when the real issue is that the back end is not done.

2. **Using 200 with an error message in the body.** Some developers return `{ error: "Not implemented" }` with a 200 status. This is misleading because 200 means "everything went fine." HTTP clients, monitoring dashboards, and browser dev tools all rely on status codes. A 200 error silently passes through error-detection systems.

3. **Forgetting to scaffold a method that will be needed later.** If you know the front end will eventually call DELETE on this resource, scaffold it now. Otherwise, a front-end developer will get a 405 and think DELETE is not supported, when really it was just forgotten.

4. **Leaving stubs in production forever.** Scaffolding is a development strategy, not a permanent state. If an endpoint has been 501 for months and no one plans to implement it, it should probably be removed. Dead stubs create confusion.

5. **Copy-pasting the stub and forgetting to update the message.** If every stub says the same generic message, that is fine. But if you start customizing messages (like `"Customer creation coming in v2"`), make sure you actually update them -- stale messages are worse than generic ones.

---

## Mini exercises

### Exercise 1 -- Audit the stubs

Search the project for all route files that return `NOT_IMPLEMENTED`. Count them. Then look at the file paths and group them by resource (customers, invoices, alerts, etc.). This gives you a map of the full planned API surface.

<details>
<summary>Hint</summary>

Try searching for the string `NOT_IMPLEMENTED` across all `route.ts` files. A tool like `grep -r "NOT_IMPLEMENTED" src/app/api/` will show every file. Count the unique files, not the individual lines (since each file has multiple methods).

</details>

### Exercise 2 -- Implement one stub

Pick any scaffolded route that interests you. Implement just the GET method to return mock data, following the pattern from the dashboard routes guide. Leave the other methods as 501 stubs. This is exactly how real implementation would proceed -- one method at a time.

### Exercise 3 -- Build a progress tracker

Write a script (in any language you are comfortable with) that scans all `route.ts` files under `src/app/api/` and counts how many exported functions return 501 vs how many contain real logic. Output something like:

```
Total route handlers: 127
Implemented: 14 (11%)
Stubbed: 113 (89%)
```

This is a quick way to measure how much of the API has been built.

<details>
<summary>Hint</summary>

A simple approach: count occurrences of `"NOT_IMPLEMENTED"` per file. If a file has that string, its methods are stubs. If it does not, they are implemented (or at least, they do something). This is a rough heuristic but good enough for tracking progress.

</details>

---

## Further reading

- **HTTP status codes (MDN):** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status -- Read through all the 4xx and 5xx codes. Understanding the difference between 400, 401, 403, 404, 405, 409, 422, 500, 501, and 503 will make you a better API developer.
- **API-first design:** Search for "API-first development approach" -- many large companies (Stripe, Twilio) design their APIs before writing any implementation code.
- **RFC 9110 Section 15.6.2** (the official spec for 501): https://www.rfc-editor.org/rfc/rfc9110#section-15.6.2
- **Contract testing:** Tools like Pact or Prism let you verify that stubs and implementations both conform to the same API specification.
