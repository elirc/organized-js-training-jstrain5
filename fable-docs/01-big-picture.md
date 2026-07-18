# Chapter 1 — The Big Picture

> **Mental model:** OpsForge is a locked building with one front door. Every request walks
> through a security guard (middleware), gets routed to either a page or an API endpoint,
> which calls business logic, which reads data. Nothing skips a layer, and everything flows
> one direction: **routes → logic → data**.

Say that to a rubber duck before reading anything else. Every chapter in this set is a
zoom-in on one part of that sentence.

## What is this app?

OpsForge is an **internal operations dashboard** for a fictional telecom/SaaS company called
NovaCom. It is the tool NovaCom's *own employees* ("operators") use to run the business:
manage customer accounts, monitor infrastructure, handle billing disputes, respond to
incidents, execute operational commands ("suspend this customer", "rotate that API key"),
control feature flags, and review audit logs.

**Why does a company build a tool like this?** Because you cannot give every employee direct
database access. Someone *will* run `UPDATE customers SET status = 'suspended'` without a
`WHERE` clause. An internal tool wraps every dangerous action in permissions, validation,
approval workflows, and an audit trail. Most working developers spend more of their careers
on tools like this than on the shiny public-facing product — which is exactly why it makes a
good training codebase.

## The layers, top to bottom

```
Browser
  │  every request, no exceptions
  ▼
middleware.ts ──────────── the security guard: logged in? no → /login
  │
  ├─► Pages      src/app/(app)/…/page.tsx     render HTML for humans
  └─► API routes src/app/api/…/route.ts       return JSON for code
        │
        ▼
      Business logic   src/lib/{auth,operations,incidents,feature-flags,…}
        │
        ▼
      Data layer       src/lib/db/ (real Postgres, mostly future)
                       src/lib/mock/ (hardcoded demo data, mostly present)
        │
        ▼
      PostgreSQL + Redis ──► worker/index.ts (background jobs)
```

**The dependency rule** (this is the one convention that keeps a codebase from turning into
soup): dependencies point *downward only*.

- Pages import components and `lib/` — never the reverse.
- API routes import `lib/` modules — never components.
- `lib/` imports the data layer — never routes or components.
- [`src/lib/db/schema.ts`](../src/lib/db/schema.ts) imports nothing from this project. It is
  the bottom of the world.

**What goes wrong without this rule:** someone imports a React component into a business-logic
module "just to reuse a type," and now your billing calculation can't run in the worker
process because it transitively pulls in browser-only code. The symptom you'll see at a real
job is a baffling build error like `useState is not defined` coming from a file that has
nothing to do with React. The one-way rule makes that impossible.

## One request, traced end to end

This is the single most useful thing to internalize. When an operator's browser asks for
`/customers`:

1. **[`middleware.ts`](../middleware.ts)** intercepts *before any page code runs*. It stamps a
   unique `x-request-id` header (so one request can be tracked across logs), checks whether
   the path is public (`/login`, `/api/auth`), and — since `/customers` is not — checks
   `req.auth`. No session? Redirect to `/login?next=/customers`. (Why `?next=`? So the app
   can send you back where you were going after login. Notice small courtesies like this;
   they're the difference between tools people tolerate and tools people like.)
2. **[`src/app/(app)/layout.tsx`](../src/app/(app)/layout.tsx)** runs on the server. It calls
   `auth()` *again* and redirects if there is no session. Isn't the middleware enough? No —
   this is defense in depth. Middleware matchers can have gaps; the layout check costs
   nothing and guarantees no shell renders for an anonymous user. Then it renders the app
   shell: sidebar, header, and `{children}`.
3. **The page** ([`src/app/(app)/customers/page.tsx`](../src/app/(app)/customers/page.tsx))
   renders inside `{children}`. Today it's a placeholder; when real, it fetches
   `GET /api/customers?limit=25`.
4. **The API route** ([`src/app/api/customers/route.ts`](../src/app/api/customers/route.ts))
   validates the query string with Zod, filters the data, paginates, and returns
   `{ success: true, data: … }` — the *envelope* shape you will meet in
   [Chapter 5](05-api-layer.md).
5. The JSON flows back and React renders it.

Every feature in this app is a variation of that trace. Learn it once, recognize it forever.

## The scaffolding philosophy (read this before judging the code)

Open ten random files in `src/app/api/` and you'll find something like this, repeated:

```typescript
// e.g. src/app/api/billing/invoices/route.ts and ~40 files like it
export async function GET() {
  return NextResponse.json(
    fail("NOT_IMPLEMENTED", "Endpoint scaffolded but not implemented yet."),
    { status: 501 },
  );
}
```

And ~30 pages that are just:

```typescript
import { PlaceholderView } from "@/components/placeholder-view";
export default function Page() {
  return <PlaceholderView title="Feature Flags" description="…" />;
}
```

This is not laziness. It is **skeleton-first development**, and it's a deliberate strategy:

- **The skeleton is the expensive part to change.** Routes, folder structure, types, and
  interfaces are hard to rework once code depends on them. Business logic inside a function
  body is cheap to change. So you build the skeleton first and get it *right*.
- **Parallel work becomes possible.** Frontend developers can build against a stubbed
  endpoint today because they know its URL, its methods, and its response shape.
- **A new developer can read the file tree like a product spec.** Every planned endpoint and
  page is visible.

Three details of the scaffolding are worth stealing for your own projects:

1. **Stubs return HTTP 501 ("Not Implemented"), not 404.** 404 means "this URL doesn't
   exist" — a frontend dev getting a 404 will waste an hour checking their URL for typos.
   501 means "you asked correctly; it isn't built yet." Status codes are communication.
2. **Stubs still use the envelope** (`fail("NOT_IMPLEMENTED", …)`). Even placeholder
   responses honor the API contract, so frontend error handling never crashes on them.
3. **Placeholder pages share one component**
   ([`src/components/placeholder-view.tsx`](../src/components/placeholder-view.tsx)) instead
   of thirty copy-pasted `<div>`s. When the placeholder design changes, one file changes.

**What's real vs. stubbed right now:** auth (login, sessions, RBAC), middleware, the app
shell, the dashboard, and the customers API are functional. The database schema is complete
but most routes read from mock data. The operations engine, worker, and domain services are
typed stubs. The two places with genuinely real algorithms are the feature-flag evaluator and
the incident severity classifier — both covered in [Chapter 8](08-domain-services.md).

## Where things live

```
jstrain5/
  middleware.ts        ← the guard (runs before everything)
  auth.ts              ← auth entry point (4 lines, wires config into NextAuth)
  worker/index.ts      ← background job processor (separate process!)
  src/
    app/               ← routes: folders ARE the URL structure
      (auth)/login/    ← route group: no app shell, just the login form
      (app)/…          ← route group: everything wrapped in sidebar + header
      api/…            ← JSON endpoints
    components/        ← reusable UI pieces
    lib/               ← business logic, one folder per domain
    types/             ← TypeScript type extensions
```

The `lib/` layout is **domain-driven**: code is grouped by business area (`auth/`,
`operations/`, `incidents/`) rather than by technical kind (`services/`, `models/`,
`controllers/`). When you work on incidents, everything you need is in one folder. The
trade-off: when domains overlap (an operation that needs an approval that references an
incident), you have to pick a home — there's no perfect answer, only a consistent one.

## Common junior mistakes

- **Judging scaffolded code as bad code.** "This function just returns a hardcoded object,
  this project is garbage" — no, it's a phase. Learn to read the *intent* of a stub: its
  signature and types tell you what the real implementation will need. The fix: before
  dismissing a file, check whether its shape is doing work even if its body isn't.
- **Skipping the trace and reading files alphabetically.** You'll understand every file and
  still not understand the app. The fix: always follow one request through the layers first;
  file-by-file reading only makes sense once you know where each file sits in the flow.
- **Putting new code in the wrong layer** — fetching data directly inside a component, or
  formatting HTTP responses inside `lib/`. The symptom at a real job: your PR gets a review
  comment like "this belongs in the service layer" and a request for changes. The fix:
  before writing, ask "which layer owns this?" using the dependency rule above.
- **Assuming one process.** The worker (`worker/index.ts`) is a *separate Node.js process*
  from the web server. A global variable set in an API route does not exist in the worker.
  This bites everyone exactly once.

## Try it yourself

1. **Run the trace live.** Start the app (`npm run dev`), open DevTools → Network, and log in
   (any email from [`src/lib/auth/operators.ts`](../src/lib/auth/operators.ts) +
   `password123`). Click "Customers" in the sidebar. Find the document request and inspect
   its response headers — you should see `x-request-id`. Now open a private/incognito window
   and go straight to `http://localhost:3000/customers`. Watch the redirect to
   `/login?next=/customers` happen. You just observed steps 1–2 of the trace.
2. **Break the guard on purpose.** In [`middleware.ts`](../middleware.ts), add `"/customers"`
   to the `publicRoutes` array and reload the incognito window. The page loads without
   login… or does it? (It doesn't — the layout's `auth()` check catches you. That's the
   defense-in-depth from step 2 paying off.) Revert your change.
3. **Predict a file's contents before opening it.** Based on the scaffolding pattern, write
   down what you expect to find inside
   [`src/app/api/runbooks/route.ts`](../src/app/api/runbooks/route.ts). Then open it. How
   close were you? (If you were right, you've learned something powerful: in a consistent
   codebase, you can predict code you've never seen.)
4. **Map the API surface.** Run a search for `NOT_IMPLEMENTED` across `src/app/api/` and
   count the files. Group them by domain. You now have the product roadmap — extracted from
   status codes.

## Ask your agent

Ask a coding agent (Claude Code, etc.):

> "Trace what happens in this repo when an unauthenticated user requests `/billing`. List
> every file that touches the request, in order, with the line that matters in each."

Then verify its answer against the trace in this chapter. Where the agent's answer differs,
open the files and decide who's right. This is the core skill of
[Chapter 9](09-ai-assisted-engineering.md): agents are excellent at tracing flows, but you
only benefit if you can *check* the trace.

---

**You can now:** explain the app's layers to someone else, follow any request through them,
and read scaffolded code for intent instead of dismissing it.

**Next:** [Chapter 2 — Tooling & Config](02-tooling.md), where you learn what all the config
files at the repo root actually do, and why professional projects enforce conventions with
machines instead of asking nicely.
