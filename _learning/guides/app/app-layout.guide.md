# Guide: App Layout

**File:** `src/app/(app)/layout.tsx`

---

## Purpose

This is the authenticated layout -- the shell that wraps every page inside the `(app)` route group (dashboard, settings, and all the other internal tools). It does three things:

1. Checks if the user is authenticated. If not, it redirects to the login page.
2. Renders the sidebar navigation (visible on large screens).
3. Renders the header bar with the current operator's name and role.

This is the file that makes OpsForge feel like a real application rather than a collection of standalone pages. The sidebar and header persist across all internal navigation, so the user never loses their bearings.

---

## Line-by-Line Walkthrough

### Imports

```typescript
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { OpsforgeNav } from "@/components/opsforge-nav";
```

Five imports, each pulling in a specific piece:

- `ReactNode` -- the TypeScript type for `children`. Same as in the root layout.
- `redirect` -- the server-side redirect function from Next.js. Same one we saw in `page.tsx`.
- `auth` -- the project's authentication function. This reads the session from the request cookies and returns the current user's data (or `null` if not logged in). The `@/auth` path uses the `@` alias, which is typically configured to mean `src/` in Next.js projects.
- `AppHeader` -- the top bar component showing the operator name and mobile menu toggle.
- `OpsforgeNav` -- the sidebar navigation component with links to all the different sections.

### The Layout Function

```typescript
export default async function AppLayout({ children }: { children: ReactNode }) {
```

Notice the `async` keyword. This is an async Server Component. In Next.js App Router, Server Components can be async functions, which means you can `await` data fetching, database queries, or -- as in this case -- session checking directly inside the component. No `useEffect`, no loading states, no client-side fetching. The server waits for the data and sends complete HTML.

This is a big deal. In older React patterns, you'd have to render the page first, then check auth on the client, then redirect -- causing a flash of the protected content. Here, the auth check happens before any HTML is generated.

### The Auth Guard

```typescript
const session = await auth();
if (!session) { redirect("/login"); }
```

Two lines. That's the entire authentication guard for every page in the app.

`await auth()` calls into NextAuth's server-side session helper. It reads the session token from the request's cookies, validates it, and returns the session object (which includes `user.name`, `user.role`, etc.) or `null`.

If there's no session, `redirect("/login")` immediately stops rendering and sends the user to the login page. Because this is in a layout (not a page), it protects every page nested under this layout. You don't need to add auth checks to individual pages.

This is the "layout as middleware" pattern. Instead of writing middleware or repeating auth checks, you put the check in the layout that wraps all protected routes. Clean and centralized.

### The Shell Structure

```typescript
return (
  <div className="flex min-h-screen">
```

The outermost div uses flexbox (`flex`) and fills the viewport height (`min-h-screen`). This creates a horizontal layout: sidebar on the left, content on the right.

### The Sidebar

```typescript
<aside className="hidden w-64 border-r border-[var(--line)] bg-[var(--surface)] p-4 lg:block">
  <div className="mb-6">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">NovaCom</p>
    <h1 className="text-xl font-bold">OpsForge</h1>
  </div>
  <OpsforgeNav />
</aside>
```

The `<aside>` element is semantically correct for a sidebar -- it's supplementary navigation content.

`hidden lg:block` is a responsive pattern. On small screens (phones, small tablets), the sidebar is completely hidden (`display: none`). On large screens (1024px and up, the `lg:` breakpoint), it becomes visible (`display: block`). This is mobile-first responsive design: start hidden, then show on larger screens.

`w-64` sets the width to 16rem (256px) -- a standard sidebar width.

The branding section ("NovaCom" / "OpsForge") gives users a visual anchor. `<OpsforgeNav />` renders the list of navigation links.

### The Main Content Area

```typescript
<div className="flex min-h-screen flex-1 flex-col">
  <AppHeader operatorLabel={`${session.user.name} (${session.user.role})`} />
  <main className="p-4 md:p-6">{children}</main>
</div>
```

`flex-1` makes this div expand to fill all remaining horizontal space (everything to the right of the sidebar).

`flex-col` stacks children vertically: header on top, main content below.

`<AppHeader>` receives the operator label as a prop. Notice how the session data flows: `auth()` returned the session, we confirmed it exists, and now we safely access `session.user.name` and `session.user.role`. TypeScript knows these exist because we already checked `if (!session)` above -- the code after that check has a narrowed type where `session` is non-null.

`<main>` wraps the page content with responsive padding: `p-4` (1rem) on small screens, `p-6` (1.5rem) on medium screens and up.

`{children}` is where the actual page renders -- `/dashboard` shows the dashboard, `/settings` shows settings, etc.

---

## Concepts Taught

- **Async Server Components:** Using `async/await` directly in component functions for server-side data fetching.
- **Layout-level auth guards:** Centralizing authentication checks so individual pages don't need to worry about it.
- **The `(app)` route group:** How parenthesized folder names in Next.js create route groups that share a layout without affecting the URL.
- **Session handling:** Reading auth state on the server via NextAuth's `auth()` function.
- **Responsive hiding:** The `hidden lg:block` pattern for showing/hiding elements at different breakpoints.
- **Semantic HTML:** Using `<aside>` for sidebar and `<main>` for primary content.
- **TypeScript narrowing:** How checking `if (!session)` and returning/redirecting allows safe access to `session.user` afterward.
- **Prop drilling from server to client:** Passing server-fetched data (session) as props to client components (the header).

---

## Common Mistakes

1. **Forgetting `async` on the function.** If you write `export default function AppLayout` without `async`, the `await auth()` call will be a syntax error. Server Components can be async; Client Components cannot.

2. **Putting `"use client"` on this file.** If you add `"use client"`, the `await auth()` call breaks because client components can't be async and can't call server-side auth functions. The auth check must happen on the server.

3. **Accessing session properties without the null check.** If you skip the `if (!session)` guard and go straight to `session.user.name`, TypeScript will complain (session might be null) and at runtime, unauthenticated users would get a crash instead of a redirect.

4. **Duplicating auth checks in every page.** Since this layout already checks auth, pages inside `(app)/` don't need their own checks. Adding redundant checks wastes a database query and clutters the code. Trust the layout.

5. **Confusing `(app)` with a URL segment.** The parentheses mean this folder does not appear in the URL. The dashboard page lives at `src/app/(app)/dashboard/page.tsx` but its URL is `/dashboard`, not `/(app)/dashboard`. Route groups are purely organizational.

6. **Not accounting for the hidden sidebar on mobile.** The sidebar is `hidden` on small screens, so you need another way for mobile users to navigate. That's what the `<AppHeader>` component handles -- it typically includes a hamburger menu or mobile nav. If you forget this, mobile users are stuck.

---

## Mini Exercises

### Exercise 1: Log the session object
Add `console.log("Session:", JSON.stringify(session, null, 2));` right after `const session = await auth();`. Because this is a Server Component, the log appears in your terminal (not the browser console). Start the dev server, visit any page inside `(app)/`, and look at your terminal output. What properties does the session contain?

### Exercise 2: Restrict by role
After the auth check, add a role check:

```typescript
if (session.user.role !== "admin") {
  redirect("/unauthorized");
}
```

Now only admins can access the app. Log in as a non-admin user and see what happens. (Create a simple `/unauthorized` page first.) Remove the check when done -- but notice how easy it was to add. Layout-level guards make authorization straightforward.

### Exercise 3: Make the sidebar always visible
Change `hidden lg:block` to just `block` (remove the responsive hiding). See how the layout looks on a narrow browser window. The sidebar takes up too much space on small screens, right? Now try `hidden md:block` instead of `lg:block` -- the sidebar shows at a smaller breakpoint. Play with different breakpoints (`sm`, `md`, `lg`, `xl`) to understand how they work.

---

## Further Reading

- **Next.js Route Groups:** [Next.js Docs -- Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- **Next.js Layouts:** [Next.js Docs -- Layouts](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- **NextAuth `auth()` function:** [NextAuth.js Docs -- Getting the session](https://next-auth.js.org/getting-started/session)
- **Server Components:** [Next.js Docs -- Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- **Tailwind responsive design:** [Tailwind Docs -- Responsive Design](https://tailwindcss.com/docs/responsive-design)
- **Semantic HTML elements:** [MDN -- aside](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/aside), [MDN -- main](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main)
