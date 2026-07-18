# Chapter 6 — The UI Layer: Components, Layouts, and the Server/Client Boundary

> **Mental model:** in Next.js App Router, every component runs on the server unless it asks
> to run in the browser. The question that organizes this entire chapter — and most UI code
> review comments you'll ever receive — is: *does this component need the browser?* If it
> reads data and renders markup: server. If it holds state, handles clicks, or reads the
> URL: client (`"use client"`).

## The boundary, concretely

Compare two components you've already brushed past:

- [`src/components/kpi-card.tsx`](../src/components/kpi-card.tsx) — no directive → **server
  component**. It takes props, returns markup. It ships (almost) no JavaScript to the
  browser; the browser receives finished HTML.
- [`src/components/opsforge-nav.tsx`](../src/components/opsforge-nav.tsx) — starts with
  `"use client"` → **client component**. It calls `usePathname()`, which only exists in the
  browser (the server doesn't have "the current URL the user is looking at" as a concept
  after the response is sent).

**Why default to server?** Every client component's code must be downloaded, parsed, and
executed by the visitor's browser. Server components cost the visitor nothing. The
junior-visible symptom of getting this wrong at scale: a dashboard that takes four seconds
to become interactive because someone put `"use client"` at the top of every file "to make
the errors go away." The directive is a *boundary marker*, not a fix-all — and everything a
client component imports gets pulled into the browser bundle with it. That's exactly the
mistake the `"server-only"` tripwire in [`src/lib/db/index.ts`](../src/lib/db/index.ts)
exists to catch ([Chapter 3](03-data-layer.md)).

## The smallest possible component, read properly

```typescript
// src/components/kpi-card.tsx — complete file
type KpiCardProps = {
  label: string;
  value: string;
  trend?: string;              // ← optional: not every metric has a trend
};

export function KpiCard({ label, value, trend }: KpiCardProps) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {trend ? <p className="mt-1 text-xs text-slate-500">{trend}</p> : null}
    </div>
  );
}
```

This is the fundamental React contract: **data in through typed props, markup out**. Two
details worth a junior's attention:

- `value: string`, not `number` — the *caller* formats (`"$6.92M"`, `"44,983"`). The card
  stays dumb and reusable; formatting policy lives with the data. Deciding *which side of a
  prop boundary* a responsibility belongs on is most of component design.
- `{trend ? … : null}` — conditional rendering. Returning `null` renders nothing. The
  common bug here is `{trend && <p>…</p>}` with a numeric value: if `trend` were `0`, React
  renders a literal `0` on screen. Ternary-to-null avoids the trap entirely.

The dashboard ([`src/app/(app)/dashboard/page.tsx`](../src/app/(app)/dashboard/page.tsx))
then renders a grid of these with `dashboardKpis.map(kpi => <KpiCard key={kpi.label} … />)` —
the **map-over-data** pattern: UI as a function of an array, no copy-paste, and the `key`
prop giving React a stable identity for each item so re-renders don't shuffle state.

## The nav: the best client component in the repo

[`src/components/opsforge-nav.tsx`](../src/components/opsforge-nav.tsx) packs four
professional patterns into 80 lines:

```typescript
"use client";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";   // ← type-only import: erased at build
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const navItems: NavItem[] = [                      // ← data OUTSIDE the component:
  { href: "/dashboard", label: "Dashboard", icon: Gauge },   //   created once, not per render
  { href: "/customers", label: "Customers", icon: Users },
  // …13 modules total
];

export function OpsforgeNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
            )}>
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

1. **Data-driven rendering.** Thirteen links defined as an array, rendered by one `map`.
   Adding a module to the app = adding one object. Without this, adding a page means
   copy-pasting a `<Link>` block and — inevitably — forgetting to update one of its three
   class strings.
2. **Components as data.** `icon: Gauge` stores the *component itself* (not `<Gauge />`,
   the rendered element) so the map can render it later as `<item.icon />` with its own
   props. Functions-as-values, applied to UI.
3. **Active-link detection.** `pathname === item.href || pathname.startsWith(`${item.href}/`)`
   — exact match *or* child route, so `/customers/cus_001` still highlights "Customers."
   The `/` in `startsWith` matters: without it, `/incidents-archive` would highlight
   `/incidents`. Off-by-one-character bugs in path logic are a rite of passage.
4. **`cn()` for conditional classes.** [`src/lib/utils.ts`](../src/lib/utils.ts) is four
   lines: `clsx` (conditionally join class names) piped through `tailwind-merge` (resolve
   Tailwind conflicts — of `p-2 p-4`, the later wins instead of both being emitted). Every
   codebase using Tailwind has this exact helper; recognize it on sight.

`Link` (from `next/link`) renders an `<a>` but intercepts the click for **client-side
navigation** — swap the page content without a full reload. That's also why layouts
persist across navigation, which brings us to:

## Layouts: the nesting doll

```
src/app/layout.tsx            ← root: <html>, <body>, fonts, global CSS — wraps EVERYTHING
  src/app/(auth)/login/…      ← no extra layout: login gets a bare page
  src/app/(app)/layout.tsx    ← app shell: auth check + sidebar + header — wraps all app pages
    src/app/(app)/dashboard/page.tsx   ← swaps per navigation
```

The parenthesized folders — `(auth)`, `(app)` — are **route groups**: they organize files
and attach layouts *without appearing in the URL* (`/login`, not `/(auth)/login`). This is
how the login page escapes the sidebar: it simply lives outside the `(app)` group. The
problem route groups solve is real — before them, "two different shells" meant conditional
rendering hacks in one root layout.

[`src/app/layout.tsx`](../src/app/layout.tsx) does root-only work: loads the Geist fonts as
CSS variables, sets `<html lang="en">`, imports `globals.css`, exports `metadata` (the
browser tab title). [`src/app/(app)/layout.tsx`](../src/app/(app)/layout.tsx) you traced in
[Chapter 1](01-big-picture.md) — the `auth()` check, then sidebar + `AppHeader` +
`{children}`. Because layouts persist, the sidebar does *not* re-render when you navigate;
only `{children}` swaps. And [`src/app/page.tsx`](../src/app/page.tsx) — the `/` route —
is four lines that `redirect("/dashboard")`: the root URL is just a signpost.

## Theming: CSS variables under Tailwind

[`src/app/globals.css`](../src/app/globals.css) defines the palette as CSS custom
properties, twice:

```css
:root {
  --background: #f4f6fb;  --surface: #ffffff;  --accent: #005ecb;  /* light */
}
@media (prefers-color-scheme: dark) {
  :root {
    --background: #090b12;  --surface: #121626;  --accent: #5ca8ff; /* dark */
  }
}
```

Components never name colors — they say `bg-[var(--surface)]` or use the Tailwind names
(`bg-background`) that [`tailwind.config.ts`](../tailwind.config.ts) maps onto these
variables. Flip the OS to dark mode and every component recolors *with zero component
changes*, because the variables change out from under them. That's the entire dark-mode
architecture: one indirection, applied consistently. The file also defines small utility
classes (`.panel`, `.badge`, `.text-dim`) via `@layer utilities` — shared visual vocabulary
you've seen in the dashboard and placeholder components.

Two smaller components round out the shell:
[`src/components/app-header.tsx`](../src/components/app-header.tsx) (sticky positioning
via `sticky top-0 z-20`, `aria-label`s on icon-only controls — accessibility is not
optional garnish; icon buttons are invisible to screen readers without labels, and
reviewers check) and [`src/components/placeholder-view.tsx`](../src/components/placeholder-view.tsx)
(the scaffolding stand-in from [Chapter 1](01-big-picture.md), with a default prop:
`readiness = "scaffolded"`).

## Common junior mistakes

- **`"use client"` as an error-silencer.** You used a hook in a server component, the error
  said to add the directive, you added it, error gone — and you just moved that component
  and *everything it imports* into the browser bundle. First ask: can the interactive part
  be split into a small client child instead?
- **Defining constant data inside the component body.** `const navItems = […]` *inside* the
  function is rebuilt on every render. Harmless at 13 items; a habit that hurts at 13,000.
  Constants go outside.
- **Missing or index-based `key` in `.map()`.** React needs stable identity. Using the
  array index as key breaks the moment the list reorders (state sticks to positions, not
  items). Use a real ID (`item.href`, `kpi.label`).
- **String-concatenating class names.** `"px-3 " + (active ? "bg-blue" : "")` — trailing
  spaces, Tailwind conflicts, unreadable diffs. That's what `cn()` is for.
- **Hardcoding a hex color in a component.** It looks right in light mode and invisible in
  dark mode. If a color isn't a `var(--…)` or a theme-aware Tailwind class, it's a bug
  waiting for a theme.

## Try it yourself

1. **Watch the boundary.** Open the dashboard with DevTools → Network → JS filter. Note
   what loads. Now add `"use client"` to the top of
   [`src/app/(app)/dashboard/page.tsx`](../src/app/(app)/dashboard/page.tsx), reload, and
   compare. Same pixels, more JavaScript shipped. Revert, and remember the diff next time
   the directive tempts you.
2. **Break the active-link logic.** In the nav, change `pathname.startsWith(`${item.href}/`)`
   to `pathname.startsWith(item.href)` and navigate around. Find a pair of routes where two
   links highlight at once (hint: `/settings` vs any future `/settings-…` — or just reason
   it out). Precision in path predicates; revert after.
3. **Predict, then open.** Before opening
   [`src/app/(app)/settings/page.tsx`](../src/app/(app)/settings/page.tsx), write down its
   exact contents based on the placeholder pattern. Open it. If you nailed it, the codebase's
   consistency is doing its job — for you *and* for any AI agent working here.
4. **Add a nav module properly.** Add a "Playground" item pointing at `/playground`, then
   create `src/app/(app)/playground/page.tsx` using `PlaceholderView`. Total work: one array
   entry, one small file. Feel how the data-driven nav and the placeholder component made
   this a two-minute task — that's what good structure buys.
5. **Theme flip.** Toggle your OS between light and dark mode with the app open. Then find
   the one place in the login page ([`src/app/(auth)/login/page.tsx`](../src/app/(auth)/login/page.tsx))
   that *doesn't* respond — it uses fixed slate colors deliberately. Is that a bug or a
   design decision? (Arguable! Login pages often pin their branding. The skill is noticing.)

## Ask your agent

> "In this repo, replace the placeholder at src/app/(app)/feature-flags/page.tsx with a
> real page: a table of mock feature flags (key, type, enabled, rollout %) styled like the
> Regional Service Health table in src/app/(app)/dashboard/page.tsx — same panel/table/badge
> classes, same server-component approach. Put mock data in src/lib/mock/."

Review against this chapter: did it stay a server component (no gratuitous
`"use client"`)? Reuse `.panel` and `.badge` instead of inventing styles? Use CSS
variables/theme classes rather than hardcoded hex? Put the mock next to the existing mocks
with typed unions? Every "no" is a review comment you now know how to write.

---

**You can now:** decide server vs. client for any component and defend the choice, build a
data-driven list with correct keys, add a page + nav entry the way this codebase intends,
and explain how dark mode works here in one sentence.

**Next:** [Chapter 7 — The Operations Engine](07-operations-engine.md): the command pattern,
the registry, and the pipeline that will someday suspend a thousand customers safely.
