# Guide: middleware.ts (Project Root)

## Purpose

Every web app needs a bouncer at the door. That is what this file does. It sits between the user's browser and your actual pages, intercepting every single request before Next.js renders anything. Its job here is simple: if you are not logged in and you try to visit a protected page, you get kicked to `/login`. If you are logged in (or the page is public), the request passes through untouched.

This is called **middleware** -- code that runs in the middle, between the request arriving and the response being sent back.

In Next.js specifically, a file named `middleware.ts` at the project root is special. The framework automatically picks it up and runs it on every matching request. You do not import it anywhere; Next.js handles that for you.

---

## Line-by-Line Walkthrough

### Imports

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
```

`NextResponse` is Next.js's helper for creating HTTP responses. You use it to redirect users, pass requests through, set headers, and so on. Think of it as your toolkit for controlling what the browser receives.

`auth` is imported from the project's own auth configuration (the `@/` is a path alias that points to the project root). This is the NextAuth.js wrapper that lets us check whether the current request has a valid session. By wrapping our middleware function with `auth()`, every request automatically gets authentication info attached to it.

### The public routes list

```typescript
const publicRoutes = ["/login", "/api/auth"];
```

This is a plain array of URL path prefixes that anyone can visit without being logged in. `/login` is obvious -- you need to reach the login page to log in. `/api/auth` covers the NextAuth API endpoints that handle the actual sign-in/sign-out flow behind the scenes.

This is a reasonable pattern, but be honest about the tradeoff: it is a hand-maintained list. If someone adds a new public page and forgets to update this array, that page will accidentally require authentication. A comment above this line in the real codebase would be a good improvement.

### The middleware function

```typescript
export default auth((req) => {
```

This is the core trick. We are not just exporting a plain function -- we are passing our function *into* `auth()`, which wraps it. The `auth()` wrapper does the heavy lifting of reading cookies, validating the session, and then attaching a `.auth` property to the request object before our code runs. So by the time our arrow function executes, `req.auth` is either the user's session object or `undefined`.

### Generating a request ID

```typescript
  const requestId = crypto.randomUUID();
```

Every request gets a unique ID. This is a production best practice for **observability** -- when something goes wrong, you can search your logs for this specific ID and trace exactly what happened during that request. `crypto.randomUUID()` is a built-in Web API (no npm package needed) that generates a UUID v4 string like `"3b99e63a-1f4b-4c2d-8a7c-5e6f7a8b9c0d"`.

### Reading the pathname

```typescript
  const pathname = req.nextUrl.pathname;
```

`req.nextUrl` is a parsed URL object that Next.js provides. The `.pathname` is just the path part of the URL -- for example, if someone visits `https://yourapp.com/dashboard?tab=settings`, the pathname is `/dashboard`. We pull it out into a variable because we use it twice below.

### Checking if the route is public

```typescript
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
```

This iterates over the `publicRoutes` array and checks if the current pathname starts with any of them. `.some()` returns `true` as soon as it finds a match, `false` if none match. Using `startsWith` (instead of `===`) means `/api/auth/callback/github` also counts as public, not just `/api/auth` exactly. That is intentional -- auth routes have many sub-paths.

### The redirect logic

```typescript
  if (!isPublic && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set("x-request-id", requestId);
    return res;
  }
```

Here is the actual gate. If the route is NOT public AND the user is NOT authenticated, we:

1. Build a URL pointing to `/login`. The second argument (`req.url`) is the base URL so the `new URL()` constructor produces a full absolute URL like `https://yourapp.com/login`.
2. Tack on a `?next=/dashboard` query parameter. This is a classic pattern -- after the user logs in, the login page can read this parameter and redirect them back to where they were trying to go. Without this, every login would dump you on the homepage.
3. Create a redirect response. `NextResponse.redirect()` returns a response with a 307 status code (temporary redirect) by default.
4. Attach the request ID header for tracing.
5. Return the response immediately. When middleware returns a response, Next.js sends it to the browser and never renders the actual page.

### The pass-through case

```typescript
  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  return res;
});
```

If we get past the `if` block (meaning the route is public OR the user is authenticated), we call `NextResponse.next()`. This tells Next.js: "keep going, render the page normally." We still attach the request ID header so every response, whether redirected or not, is traceable.

### The matcher config

```typescript
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

This is a Next.js-specific export that controls *which requests* the middleware runs on. The regex is a negative lookahead that says: "match everything EXCEPT paths starting with `_next/static`, `_next/image`, or `favicon.ico`." Those are static assets (JS bundles, optimized images, the favicon) that do not need auth checks. Running middleware on every static file request would waste resources and potentially break asset loading.

The regex looks intimidating but you can read it as: "run on all page and API routes, skip static files."

---

## Concepts Taught

- **Middleware pattern**: Code that intercepts requests before they reach your application logic. This concept exists in Express, Django, Rails, and virtually every web framework.
- **Authentication gating**: Protecting routes by checking session status before rendering.
- **Route matching**: Using path prefixes and regex to decide which requests to process.
- **Request tracing with UUIDs**: Assigning unique IDs for log correlation and debugging.
- **URL manipulation**: Using the `URL` constructor and `searchParams` to build redirect URLs cleanly.
- **Next.js middleware conventions**: The special filename, the `config.matcher` export, and `NextResponse`.

---

## Common Mistakes

1. **Forgetting to update the public routes array.** You add a `/signup` page, forget to list it here, and now nobody can reach it without being logged in. Consider adding a comment or co-locating the list with your route definitions.

2. **Using exact equality instead of `startsWith`.** Writing `pathname === "/api/auth"` would block all the sub-routes like `/api/auth/callback/github`. The current code gets this right with `startsWith`, but it is an easy trap.

3. **Not excluding static assets.** Without the `matcher` config, the middleware would run on requests for JavaScript bundles and images, potentially redirecting or slowing down asset loading. Always check that your matcher is excluding `_next/static` and similar paths.

4. **Redirecting to a relative URL.** `NextResponse.redirect()` requires a full absolute URL. Writing `NextResponse.redirect("/login")` will throw an error. The code correctly uses `new URL("/login", req.url)` to build the absolute URL.

5. **Doing heavy work in middleware.** Middleware runs on the edge (or at least on every matching request). Database queries, API calls, or slow logic here will delay every single page load. This file correctly keeps it light -- just a session check and a string comparison.

---

## Mini Exercises

### Exercise 1: Add a public route

The product team wants a `/pricing` page that anyone can see without logging in. Make the change to the middleware so that `/pricing` is accessible to unauthenticated users. Verify your logic by tracing through what happens when an unauthenticated user visits `/pricing`.

<details>
<summary>Hint</summary>

You only need to change one line. Add `"/pricing"` to the `publicRoutes` array. Then trace the logic: `pathname` is `"/pricing"`, `isPublic` becomes `true` because `"/pricing".startsWith("/pricing")` is `true`, so the `if (!isPublic && !req.auth)` block is skipped, and `NextResponse.next()` lets the request through.

</details>

### Exercise 2: Add a custom header

For debugging, you want every response to include a header called `x-middleware-timestamp` with the current time as an ISO string. Modify the middleware so that both the redirect response and the pass-through response include this header.

<details>
<summary>Hint</summary>

Add `res.headers.set("x-middleware-timestamp", new Date().toISOString());` before each `return res;` statement. There are two return points -- one inside the `if` block (the redirect case) and one at the end (the pass-through case). You need to add the header in both places.

</details>

### Exercise 3: Log the request

Add a `console.log` at the top of the middleware function that logs the HTTP method, the pathname, and whether the user is authenticated. Format it like: `[MIDDLEWARE] GET /dashboard (authenticated: true)`. Think about where this log statement should go and what properties of `req` you need.

<details>
<summary>Hint</summary>

Place it right after the `const pathname` line. You can access the HTTP method via `req.method` and the auth status via `!!req.auth` (double-bang converts it to a boolean). The line would be: `console.log(\`[MIDDLEWARE] ${req.method} ${pathname} (authenticated: ${!!req.auth})\`);`

</details>

---

## Further Reading

- **Next.js Middleware documentation**: The official docs explain the execution model, edge runtime limitations, and all the `NextResponse` methods.
- **NextAuth.js middleware integration**: How `auth()` wraps middleware and what properties it attaches to the request.
- **HTTP redirects (301 vs 302 vs 307)**: Understanding the difference matters when search engines crawl your site. 307 preserves the HTTP method, which is why Next.js defaults to it.
- **UUID v4 and request tracing**: Look into distributed tracing concepts and tools like OpenTelemetry to understand why request IDs matter at scale.
- **Regular expressions in route matching**: The negative lookahead in the matcher config is a useful regex pattern worth understanding beyond just this file.
