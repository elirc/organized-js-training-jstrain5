# Guide: KpiCard Component

**Source file:** `src/components/kpi-card.tsx`

---

## Purpose

`KpiCard` is a small, reusable UI component that displays a single key performance indicator -- a metric like "Active Customers: 1,204" or "Revenue: $84k". Dashboards are built by laying out a grid of these cards, so understanding this component teaches you the most fundamental pattern in React: **accept data through props, return markup**.

This is one of the simplest components in the entire OpsForge codebase, which makes it a perfect first read.

---

## Line-by-line walkthrough

```typescript
type KpiCardProps = {
  label: string;
  value: string;
  trend?: string;
};
```

This is a **TypeScript type alias**. It describes the shape of the data this component accepts. Think of it as a contract: "If you want to use KpiCard, you must hand it a `label` (string) and a `value` (string). You *may* also hand it a `trend` (string), but you don't have to."

The `?` after `trend` is what makes that prop optional. Without the `?`, TypeScript would yell at you every time you used `<KpiCard>` without providing a trend.

Why are `label` and `value` both strings instead of, say, `value` being a number? Because the parent component is responsible for formatting. A number like `84291.5` might need to display as `"$84,291.50"` or `"84.3k"` depending on context. By accepting a pre-formatted string, KpiCard stays simple and doesn't need to know anything about number formatting.

```typescript
export function KpiCard({ label, value, trend }: KpiCardProps) {
```

This is a **named export** of a function component. A few things to notice:

- `export function` (not `export default function`). Named exports are preferred in most modern React codebases because they force you to import with the exact name: `import { KpiCard } from ...`. This makes searching and refactoring easier.
- `{ label, value, trend }` is **destructuring** the props object right in the parameter list. It's equivalent to writing `(props: KpiCardProps)` and then doing `const { label, value, trend } = props;` inside the function body. The shorthand version just saves a line.

```typescript
  return (
    <div className="panel p-4">
```

The component returns JSX -- HTML-like syntax that React transforms into actual DOM elements. `className` is React's version of HTML's `class` attribute (they renamed it because `class` is a reserved word in JavaScript).

`"panel p-4"` are **Tailwind CSS utility classes**. `panel` is a custom class defined elsewhere in the project's styles (probably setting a background, border, and border-radius). `p-4` means "padding on all sides of 1rem (16px)." Tailwind's naming convention: `p` = padding, `4` = 1rem on the default scale.

```typescript
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
```

This paragraph displays the label (like "Active Customers"). Let's break down the classes:

- `text-xs` -- extra-small font size (0.75rem / 12px)
- `font-semibold` -- font weight 600 (bolder than normal, lighter than bold)
- `uppercase` -- transforms text to ALL CAPS via CSS `text-transform`
- `tracking-wide` -- increased letter-spacing, which improves readability of uppercase text
- `text-slate-500` -- a medium gray color from Tailwind's slate palette

This cluster of classes is a common design pattern for a "label" or "overline" -- small, muted, uppercase text that categorizes the big number below it.

```typescript
      <p className="mt-2 text-2xl font-bold">{value}</p>
```

The hero of the card -- the actual metric value. `mt-2` adds a small top margin (0.5rem). `text-2xl` is a large font size (1.5rem). `font-bold` is weight 700. This is the number your eye should land on first.

```typescript
      {trend ? <p className="mt-1 text-xs text-slate-500">{trend}</p> : null}
```

This is a **conditional render**. The pattern `{condition ? <element> : null}` means "render this element if the condition is truthy, otherwise render nothing." Since `trend` is optional, it might be `undefined`. If it's undefined (falsy), we render `null`, which tells React to put nothing in the DOM.

A common string you might pass here: `"+12% vs last month"`.

```typescript
    </div>
  );
}
```

Close the div, close the return, close the function. Done.

---

## Concepts taught

1. **TypeScript type aliases for props** -- defining the contract a component expects.
2. **Optional props** -- the `?` syntax and what it means for callers.
3. **Destructured function parameters** -- pulling values out of the props object inline.
4. **Named exports** -- `export function` vs `export default function` and why named exports are preferred.
5. **Conditional rendering** -- the ternary pattern for showing/hiding elements.
6. **Tailwind CSS utility classes** -- composing styles directly in the markup.
7. **Presentational (dumb) components** -- components that take data in and render it, with zero logic or state.

---

## Common mistakes

**1. Forgetting that optional props can be `undefined`.**
If you tried to call `trend.toUpperCase()` without checking first, your app would crash when `trend` is undefined. The ternary guard (`trend ? ... : null`) prevents this. Always handle the "not provided" case for optional props.

**2. Using `{trend && <p>...</p>}` instead of the ternary.**
This works most of the time, but it has a gotcha: if `trend` were the number `0` (falsy but a valid value), it would render the literal text `0` in the DOM instead of nothing. The ternary is slightly more explicit and avoids that class of bug. For string props it's fine either way, but building the ternary habit is safer.

**3. Passing a number as `value` without converting to string.**
TypeScript will actually catch this for you (since `value` is typed as `string`), but in plain JavaScript this would silently work and could cause issues later. Always be conscious of the types your component expects.

**4. Thinking `className` supports arrays or objects.**
Unlike libraries like `clsx` or `classnames`, the raw `className` attribute only accepts a string. If you need to conditionally join classes, you'd need a utility function (this project has one called `cn` -- you'll see it in other guides).

---

## Mini exercises

### Exercise 1: Add an icon prop
Add an optional `icon` prop to `KpiCard` that accepts a React node (type: `React.ReactNode`). When provided, render it to the left of the label. Think about: where does it go in the JSX? Do you need to adjust the layout (maybe `flex` and `items-center` on a wrapper div)?

### Exercise 2: Handle a "loading" state
Add an optional boolean prop called `loading`. When `true`, display a gray placeholder bar instead of the value (just a `<div>` with a fixed height, background color, and `animate-pulse` for a Tailwind shimmer effect). When `false` or not provided, show the value as normal.

### Exercise 3: Render a grid of KpiCards
In a separate file, create an array of 4 KPI objects (`{ label, value, trend }`) and map over them to render a grid of `KpiCard` components. Use Tailwind's `grid grid-cols-2 gap-4 lg:grid-cols-4` on the container. Pay attention to the `key` prop React requires when rendering lists.

---

## Further reading

- **React docs -- Your First Component:** https://react.dev/learn/your-first-component
- **TypeScript Handbook -- Object Types:** https://www.typescriptlang.org/docs/handbook/2/objects.html
- **Tailwind CSS -- Utility-First Fundamentals:** https://tailwindcss.com/docs/utility-first
- **React docs -- Conditional Rendering:** https://react.dev/learn/conditional-rendering
- **Thinking in React -- Presentational vs Container Components:** (search for Dan Abramov's original blog post, then read his follow-up explaining why the distinction is less important with hooks)
