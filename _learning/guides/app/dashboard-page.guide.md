# Guide: Dashboard Page

**File:** `src/app/(app)/dashboard/page.tsx`

---

## Purpose

This is the main landing page once you're logged into OpsForge. It shows key performance indicators (KPIs) across the top and a service health table below. This is the page that `/` redirects to and the first thing operators see after logging in.

From a learning perspective, this file is valuable because it demonstrates:

- How to compose a page from reusable components and data sources.
- How to render lists with `.map()`.
- How to build a responsive data table.
- How to conditionally apply styles based on data values.

It's a Server Component (no `"use client"`) that uses mock data, so there's no async fetching or loading states to worry about. That keeps the focus on layout and rendering patterns.

---

## Line-by-Line Walkthrough

### Imports

```typescript
import { KpiCard } from "@/components/kpi-card";
import { dashboardKpis, systemHealthRows } from "@/lib/mock/dashboard";
```

Two imports:

- `KpiCard` -- a presentational component that renders a single metric card (label, value, trend arrow). It lives in the shared components directory and is reusable across different pages.
- `dashboardKpis` and `systemHealthRows` -- arrays of mock data defined in `src/lib/mock/dashboard.ts`. Using a separate data file keeps the page component focused on layout and rendering, not on defining data.

This separation of concerns (page = layout, component = UI element, lib = data/logic) is a pattern you'll see throughout the project.

### Page Header Section

```typescript
<section className="space-y-6">
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold">Operations Dashboard</h2>
      <p className="text-dim mt-1">Live operational pulse across customers, services, and workflows.</p>
    </div>
    <div className="badge badge-danger">Incident bridge active</div>
  </div>
```

`<section>` -- semantically groups related content. `space-y-6` adds 1.5rem of vertical space between each direct child of the section.

The header uses flexbox to put the title on the left and a status badge on the right:

- `flex flex-wrap` -- horizontal layout that wraps to a new line on narrow screens.
- `items-end` -- vertically aligns items to the bottom edge (so the badge aligns with the bottom of the title block, not the top).
- `justify-between` -- pushes items to opposite ends.
- `gap-4` -- adds consistent spacing when items wrap.

`text-dim` is one of those custom utility classes we defined in `globals.css`. It applies `text-sm text-slate-600 dark:text-slate-300` -- smaller, muted text for secondary information.

`badge badge-danger` combines two custom utilities: `.badge` (the base pill shape) and `.badge-danger` (the red coloring). This shows the composability of the utility classes defined in `globals.css`.

### KPI Grid

```typescript
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
  {dashboardKpis.map((kpi) => (
    <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} />
  ))}
</div>
```

This is CSS Grid, not Flexbox. Grid is the right choice for card layouts because it gives you equal-width columns without any math.

- `grid` -- activates CSS Grid.
- `gap-3` -- 0.75rem gap between grid items.
- `sm:grid-cols-2` -- on small screens and up, show 2 columns.
- `xl:grid-cols-4` -- on extra-large screens, show 4 columns.
- On screens smaller than `sm`, the grid defaults to 1 column (each card stacks vertically).

The `.map()` call iterates over the `dashboardKpis` array and renders a `KpiCard` for each item. The `key={kpi.label}` prop is required by React when rendering lists -- it helps React efficiently update the DOM by identifying which items changed.

Each `KpiCard` receives three props: `label` (e.g., "Active Customers"), `value` (e.g., "1,247"), and `trend` (e.g., "+3.2%"). The component handles how to display these -- the page just passes the data.

### The Data Table

```typescript
<div className="panel overflow-hidden">
  <div className="border-b border-[var(--line)] px-4 py-3">
    <h3 className="font-semibold">Regional Service Health</h3>
  </div>
```

The table is wrapped in a `.panel` (our custom class: rounded corners, border, white/dark background). `overflow-hidden` clips the table's corners so they match the panel's rounded corners. Without it, the table's sharp corners would poke through the panel's rounded borders.

The table title sits in its own div with a bottom border, creating a visual header bar for the panel.

### Responsive Table Wrapper

```typescript
<div className="overflow-x-auto">
  <table className="w-full min-w-[640px] text-sm">
```

`overflow-x-auto` is the key to responsive tables. On narrow screens, if the table is wider than the screen, a horizontal scrollbar appears instead of the content breaking the layout.

`min-w-[640px]` ensures the table never gets narrower than 640px. On screens smaller than that, the horizontal scroll kicks in. This is a pragmatic approach: rather than making every column responsive (which gets messy for data tables), you set a minimum width and let the user scroll.

### Table Head

```typescript
<thead className="bg-[var(--surface-muted)] text-left text-xs uppercase tracking-wide text-slate-500">
  <tr>
    <th className="px-4 py-2">Service</th>
    <th className="px-4 py-2">Region</th>
    <th className="px-4 py-2">P95 Latency</th>
    <th className="px-4 py-2">Error Rate</th>
    <th className="px-4 py-2">Status</th>
  </tr>
</thead>
```

The header row uses a muted background to visually separate it from the data rows. `text-xs uppercase tracking-wide` is a common pattern for table headers -- small, uppercase, widely spaced letters give a clean, professional look that distinguishes headers from data.

### Table Body

```typescript
<tbody>
  {systemHealthRows.map((row) => (
    <tr key={`${row.service}-${row.region}`} className="border-t border-[var(--line)]">
      <td className="px-4 py-3 font-medium">{row.service}</td>
      <td className="px-4 py-3">{row.region}</td>
      <td className="px-4 py-3">{row.latencyP95}ms</td>
      <td className="px-4 py-3">{row.errorRate.toFixed(2)}%</td>
      <td className="px-4 py-3">
        <span className={`badge ${row.status === "operational" ? "badge-safe" : "badge-danger"}`}>
          {row.status}
        </span>
      </td>
    </tr>
  ))}
</tbody>
```

Another `.map()` call, this time over `systemHealthRows`. Each row renders five cells:

- **Service name** -- `font-medium` makes it slightly bolder than surrounding text, visually indicating it's the row's "primary" field.
- **Region** -- plain text.
- **Latency** -- `{row.latencyP95}ms` appends the "ms" unit directly in JSX. Simple and readable.
- **Error rate** -- `.toFixed(2)` formats the number to exactly 2 decimal places. `0.1` becomes `"0.10"`, `1.234` becomes `"1.23"`. This ensures visual consistency in the column.
- **Status** -- conditionally styled with a ternary expression. If the status is `"operational"`, it gets the green `badge-safe` class. Otherwise, it gets the red `badge-danger` class.

The `key` prop uses a composite of service and region: `` key={`${row.service}-${row.region}`} ``. This works because the combination of service + region is unique in the data. If it weren't, you'd need a proper unique ID.

---

## Concepts Taught

- **Responsive grid layouts:** CSS Grid with breakpoint-based column counts (`sm:grid-cols-2 xl:grid-cols-4`).
- **List rendering with `.map()`:** The standard React pattern for rendering arrays of data.
- **The `key` prop:** Why React needs unique keys and how to construct them.
- **Data tables in Tailwind:** Structuring tables with proper `<thead>`, `<tbody>`, `<th>`, and `<td>` elements.
- **Responsive tables:** The `overflow-x-auto` + `min-w-[...]` approach for tables that don't fit narrow screens.
- **Conditional class names:** Using ternary expressions inside template literals to switch styles based on data.
- **Number formatting:** `.toFixed(2)` for consistent decimal display.
- **Component composition:** A page importing and orchestrating multiple components and data sources.
- **Separation of concerns:** Data in `lib/mock/`, presentation in `components/`, layout in `page.tsx`.

---

## Common Mistakes

1. **Forgetting the `key` prop.** React will warn you in the console if you omit keys in a `.map()` call. Without keys, React can't efficiently diff the list, leading to potential bugs with stateful components (inputs losing their values, animations misfiring, etc.).

2. **Using array index as the key.** `key={index}` is a common shortcut that works until the list can be reordered, filtered, or have items added/removed. If the data changes, React will match the wrong components to the wrong data. Use a stable, unique identifier from the data itself.

3. **Not handling empty arrays.** If `dashboardKpis` were empty, the grid would render but be invisible (no children). If `systemHealthRows` were empty, you'd see a table header with no rows. In production, you'd add empty states: `{rows.length === 0 ? <EmptyState /> : rows.map(...)}`.

4. **Breaking the table for mobile.** Removing `overflow-x-auto` from the table wrapper would cause the table to overflow its container on narrow screens, breaking the page layout. Always wrap data tables in a horizontally scrollable container.

5. **Hardcoding data in the page.** It's tempting to put the KPI data directly in the page file. Extracting it to `lib/mock/dashboard.ts` makes the page easier to read and the data easier to find and modify. When you switch to real API data later, you only change the import, not the rendering logic.

6. **Using `{row.errorRate}%` without `.toFixed()`.** JavaScript floating-point math can produce numbers like `0.10000000000000001`. `.toFixed(2)` ensures consistent, human-readable formatting.

---

## Mini Exercises

### Exercise 1: Add a new KPI card
Open `src/lib/mock/dashboard.ts`, add a new KPI object to the `dashboardKpis` array (e.g., `{ label: "Open Incidents", value: "3", trend: "+1" }`). Save and check the dashboard. The grid should automatically accommodate the new card without any changes to the page file. This is the power of data-driven rendering.

### Exercise 2: Add a "last updated" column
Add a `lastChecked` field to each row in `systemHealthRows` (e.g., `"2 min ago"`). Then add a new `<th>` and `<td>` column to the table. Make sure the `min-w-[...]` value is wide enough for the extra column (try `min-w-[768px]`).

### Exercise 3: Improve the status badge logic
Right now, the code only checks for `"operational"` -- everything else gets the danger badge. What if there's a `"degraded"` status that should be yellow? Refactor the ternary into a small helper function:

```typescript
function statusBadgeClass(status: string): string {
  switch (status) {
    case "operational": return "badge-safe";
    case "degraded": return "badge-warning"; // you'll need to create this in globals.css
    default: return "badge-danger";
  }
}
```

Use it in the JSX: `className={`badge ${statusBadgeClass(row.status)}`}`. Add a `"degraded"` row to the mock data and create the `.badge-warning` class in `globals.css` to see it work.

---

## Further Reading

- **CSS Grid:** [MDN -- CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)
- **Tailwind Grid:** [Tailwind Docs -- Grid Template Columns](https://tailwindcss.com/docs/grid-template-columns)
- **React lists and keys:** [React Docs -- Rendering Lists](https://react.dev/learn/rendering-lists)
- **Responsive tables:** [CSS-Tricks -- Responsive Data Tables](https://css-tricks.com/responsive-data-tables/)
- **Number.prototype.toFixed:** [MDN -- toFixed](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed)
- **Component composition patterns:** [React Docs -- Thinking in React](https://react.dev/learn/thinking-in-react)
