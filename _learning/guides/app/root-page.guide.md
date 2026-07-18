# Guide: Root Page (page.tsx)

**File:** `src/app/page.tsx`

---

## Purpose

This is the simplest page in the entire application -- and that's the point. It handles what happens when someone visits the bare URL (`/`, the root of the site). The answer: immediately send them to `/dashboard`.

This is a Server Component that performs a server-side redirect. The user never sees this page. They never even get HTML for it. The server responds with a redirect instruction before any content is sent to the browser.

---

## Line-by-Line Walkthrough

```typescript
import { redirect } from "next/navigation";
```

`redirect` is a function from Next.js that throws a special internal error (yes, really -- it uses `throw` under the hood). When Next.js catches this error during server-side rendering, it stops rendering the page and instead sends an HTTP redirect response to the browser (typically a 307 Temporary Redirect).

This is a server-only function. You cannot call it in a Client Component (a file with `"use client"` at the top). If you need to redirect from the client side, you'd use `useRouter().push()` or `window.location.href` instead.

```typescript
export default function HomePage() {
  redirect("/dashboard");
}
```

The function is named `HomePage`, but it never renders anything visible. The `redirect("/dashboard")` call happens during the server render, which means:

1. A request hits `/`.
2. Next.js begins rendering `HomePage`.
3. `redirect("/dashboard")` throws.
4. Next.js catches the throw, stops rendering, and sends a `307` redirect response.
5. The browser receives the redirect and automatically makes a new request to `/dashboard`.
6. The user sees the dashboard.

There's no `return` statement with JSX here. There doesn't need to be. The `redirect` call will always throw before execution reaches any return. TypeScript doesn't complain because `redirect` is typed with a `never` return type, which tells the compiler "this function never returns normally."

### Why not just make `/dashboard` the home page?

In Next.js App Router, the file `src/app/page.tsx` always corresponds to the `/` route. You can't change that mapping. The dashboard lives at `src/app/(app)/dashboard/page.tsx` because it's inside the `(app)` route group, which applies the authenticated layout (sidebar, header, auth check).

If you deleted this root page entirely, visiting `/` would show a 404. The redirect is the clean solution: it respects the app's routing structure while giving users a sensible default destination.

---

## Concepts Taught

- **Server-side redirects:** Using `redirect()` to send users to a different URL before any HTML is rendered.
- **Next.js routing conventions:** `page.tsx` files map to URL routes. `src/app/page.tsx` is always `/`.
- **The `never` type:** A TypeScript type for functions that never return (they throw or loop forever).
- **Route groups:** The `(app)` folder is a route group -- parentheses in the folder name mean it doesn't affect the URL path but allows a separate layout.
- **Thin pages:** Not every page needs complex logic. Sometimes a page's entire job is to redirect or delegate.

---

## Common Mistakes

1. **Calling `redirect` inside a try/catch block.** Because `redirect` works by throwing, wrapping it in try/catch will catch the redirect and prevent it from working. This is a common gotcha:

   ```typescript
   // BROKEN -- the redirect gets caught
   try {
     redirect("/dashboard");
   } catch (e) {
     console.log("something went wrong"); // This fires, and the redirect never happens
   }
   ```

2. **Trying to use `redirect` in a Client Component.** The `redirect` function from `next/navigation` only works in Server Components, Route Handlers, and Server Actions. In Client Components, use the `useRouter` hook:

   ```typescript
   "use client";
   import { useRouter } from "next/navigation";
   const router = useRouter();
   router.push("/dashboard");
   ```

3. **Putting JSX after `redirect`.** Any code after `redirect()` is unreachable. TypeScript may or may not warn you depending on your setup. Don't put a return statement or any other logic after it.

4. **Using `redirect` when you mean `rewrite`.** A redirect changes the URL in the browser's address bar. A rewrite serves different content without changing the URL. If you want `/` to show the dashboard content but keep `/` in the address bar, you'd use a rewrite in `next.config.js`, not a redirect in a page component.

---

## Mini Exercises

### Exercise 1: Change the redirect destination
Change the redirect to `/login` instead of `/dashboard`. Visit `/` in your browser and confirm you land on the login page. Check the browser's Network tab (DevTools) to see the 307 redirect response. Change it back when done.

### Exercise 2: Watch the redirect in the Network tab
Open DevTools, go to the Network tab, check "Preserve log", and visit `http://localhost:3000/`. You should see two requests: one to `/` that returns a 307, and a second to `/dashboard` that returns 200. This is the redirect in action.

### Exercise 3: Try returning JSX before the redirect
Add a return statement before the redirect:

```typescript
export default function HomePage() {
  return <p>You should never see this</p>;
  redirect("/dashboard"); // Does this still fire?
}
```

What happens? The redirect never fires because `return` exits the function first. Now move the redirect above the return and see the opposite: the JSX is unreachable. This demonstrates why the order matters and why `redirect` should be the first thing in the function (or inside a conditional).

---

## Further Reading

- **Next.js `redirect` function:** [Next.js Docs -- redirect](https://nextjs.org/docs/app/api-reference/functions/redirect)
- **Next.js routing:** [Next.js Docs -- Defining Routes](https://nextjs.org/docs/app/building-your-application/routing/defining-routes)
- **Route groups:** [Next.js Docs -- Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- **TypeScript `never` type:** [TypeScript Handbook -- never](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#the-never-type)
- **HTTP redirects (307 vs 301 vs 302):** [MDN -- HTTP redirections](https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections)
