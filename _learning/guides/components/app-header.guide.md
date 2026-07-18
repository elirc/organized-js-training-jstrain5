# Guide: AppHeader Component

**Source file:** `src/components/app-header.tsx`

---

## Purpose

`AppHeader` is the sticky top bar of the OpsForge application. It contains a search input, a notifications button, and an operator label. It stays pinned to the top of the viewport as you scroll, which is a standard pattern for dashboard-style apps where you always want quick access to search and notifications.

This component is more interesting than it looks. It teaches you about **CSS custom properties (variables) in Tailwind**, **icon libraries**, **accessibility attributes**, **responsive hiding**, and **the `sticky` positioning model**.

---

## Line-by-line walkthrough

```typescript
import { Bell, Search } from "lucide-react";
```

This imports two icon components from **Lucide**, an open-source icon library. Lucide provides hundreds of icons as React components. Each icon is a small SVG that you can size and color with regular CSS/Tailwind classes.

Why import individual icons instead of the whole library? **Tree-shaking.** Bundlers like webpack and esbuild can detect that you only imported `Bell` and `Search`, and they'll exclude the other hundreds of icons from your production JavaScript bundle. If you imported the entire library, you'd ship kilobytes of SVG data you never use.

```typescript
type AppHeaderProps = {
  operatorLabel?: string;
};
```

Minimal props type: just one optional string. This component is mostly self-contained -- it doesn't need much data from its parent.

```typescript
export function AppHeader({ operatorLabel = "Ops Engineer" }: AppHeaderProps) {
```

Same default-value-on-destructuring pattern you saw in PlaceholderView. If no label is provided, the header shows "Ops Engineer."

```typescript
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]/90 px-4 py-3 backdrop-blur">
```

This single line is dense. Let's unpack every class:

- `sticky top-0` -- **sticky positioning.** The header scrolls with the page normally, but once it reaches the top of the viewport (`top-0`), it "sticks" there and stays visible. This is different from `fixed`, which removes the element from the document flow entirely. Sticky is usually what you want for headers because it doesn't leave a gap in the layout.

- `z-20` -- **z-index of 20.** This ensures the header renders on top of other content when they overlap (which they will, once the header is stuck and page content scrolls behind it). The number 20 is somewhat arbitrary but leaves room for other z-index layers (modals might be z-50, tooltips z-40, etc.).

- `border-b border-[var(--line)]` -- a bottom border whose color comes from a **CSS custom property** called `--line`. The square bracket syntax `border-[...]` is Tailwind's **arbitrary value** feature. It lets you use any CSS value, not just Tailwind's predefined palette. The `--line` variable is defined somewhere in the project's CSS and likely changes between light and dark themes.

- `bg-[var(--surface)]/90` -- background color from the `--surface` CSS variable, at **90% opacity**. The `/90` is Tailwind's opacity modifier syntax. Making the background slightly transparent allows the `backdrop-blur` effect to show through.

- `px-4 py-3` -- horizontal padding 1rem, vertical padding 0.75rem.

- `backdrop-blur` -- applies a **CSS backdrop filter** that blurs whatever is behind the header. Combined with the 90% opacity background, this creates a frosted-glass effect where content scrolling underneath is visible but blurred. This is a popular modern UI technique (you see it in macOS and iOS).

```typescript
      <div className="flex items-center justify-between gap-3">
```

A **flexbox** container. `flex` enables flexbox. `items-center` vertically centers the children. `justify-between` pushes children to opposite ends of the row (search on the left, buttons on the right). `gap-3` adds 0.75rem of space between flex children without needing margins.

```typescript
        <div className="relative hidden w-full max-w-md md:block">
```

The search bar wrapper. Key classes:

- `relative` -- establishes a **positioning context** so that the absolutely-positioned search icon inside can be placed relative to this div (not relative to the whole page).
- `hidden md:block` -- **responsive design.** The search bar is `hidden` (display: none) by default, and `md:block` makes it visible (display: block) on medium screens and larger. This means on mobile, the search bar disappears entirely. The `md:` prefix is a Tailwind responsive breakpoint (768px by default).
- `w-full max-w-md` -- takes full available width, but caps at Tailwind's `md` max-width (28rem / 448px) so it doesn't stretch across a huge monitor.

```typescript
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
```

The magnifying glass icon positioned inside the search input.

- `absolute left-2 top-2.5` -- positioned absolutely within the `relative` parent, 0.5rem from the left and 0.625rem from the top (centering it vertically in the input).
- `pointer-events-none` -- this is critical. Without it, clicking on the icon would click the icon, not the input underneath. `pointer-events-none` makes the icon "invisible" to mouse/touch events, so clicks pass through to the input behind it.
- `h-4 w-4` -- 1rem x 1rem (16px x 16px), a standard small icon size.
- `text-slate-500` -- medium gray color. Lucide icons inherit their color from the CSS `color` property, which Tailwind's `text-*` classes set.

```typescript
          <input
            aria-label="Search"
            placeholder="Search customers, operations, incidents..."
            className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-muted)] pl-8 pr-3 text-sm outline-none ring-[var(--accent)] focus:ring-1"
          />
```

The actual search input. Noteworthy details:

- `aria-label="Search"` -- an **accessibility attribute**. Since this input doesn't have a visible `<label>` element associated with it, screen readers wouldn't know what the input is for. `aria-label` provides that information. This is not optional nicety -- it's a requirement for accessible software.
- `pl-8` -- left padding of 2rem, which creates space for the search icon to sit inside the input without overlapping the typed text.
- `outline-none ring-[var(--accent)] focus:ring-1` -- removes the browser's default focus outline, then adds a custom focus ring using the `--accent` CSS variable. `focus:ring-1` means the ring only appears when the input is focused. This is a common Tailwind pattern for styling focus states.

```typescript
        <div className="ml-auto flex items-center gap-2">
```

The right-side container for the notification button and operator label. `ml-auto` pushes this div to the right side of the flex container (it eats up all remaining horizontal space as left margin).

```typescript
          <button type="button" className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-2" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
```

A button containing the bell icon. Important points:

- `type="button"` -- in HTML, the default type for a `<button>` inside a `<form>` is `"submit"`, which can cause accidental form submissions. Explicitly setting `type="button"` prevents that. This is a good habit to develop: always set the type on buttons.
- `aria-label="Notifications"` -- again, accessibility. The button has no visible text, just an icon, so without this attribute a screen reader user would hear something useless like "button" with no context.
- The button doesn't have an `onClick` handler. Right now it's purely visual. In a real app, clicking it would open a notifications panel. This is fine for a work-in-progress.

```typescript
          <div className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs">
            {operatorLabel}
          </div>
```

The operator label, styled as a pill/badge. It reuses the same border and background pattern as the button for visual consistency. Notice this is a `<div>`, not a `<button>` -- it's not interactive, just informational.

```typescript
        </div>
      </div>
    </header>
  );
}
```

Close everything. The component is complete.

---

## Concepts taught

1. **Icon libraries and tree-shaking** -- importing only what you need from `lucide-react`.
2. **Sticky positioning** -- `sticky top-0` and how it differs from `fixed`.
3. **CSS custom properties in Tailwind** -- the `border-[var(--line)]` arbitrary value syntax for theme-driven colors.
4. **Opacity modifiers** -- `bg-[var(--surface)]/90` for semi-transparent backgrounds.
5. **Backdrop blur / frosted glass effect** -- combining translucent backgrounds with `backdrop-blur`.
6. **Responsive design** -- `hidden md:block` to show/hide elements at different breakpoints.
7. **Positioning context** -- `relative` on a parent + `absolute` on a child for placing icons inside inputs.
8. **`pointer-events-none`** -- making decorative elements click-through.
9. **Accessibility attributes** -- `aria-label` on inputs and icon-only buttons.
10. **Focus styling** -- replacing browser defaults with custom focus rings.

---

## Common mistakes

**1. Forgetting `aria-label` on icon-only buttons.**
If a button only contains an icon and no text, screen reader users have no idea what it does. Always add `aria-label` (or `aria-labelledby` pointing to a visible element). This is one of the most common accessibility violations on the web and one of the easiest to fix.

**2. Using `fixed` when you mean `sticky`.**
`position: fixed` removes the element from the document flow entirely, meaning the content below it will overlap where the header was. You'd need to add manual padding to the body to compensate. `sticky` is almost always what you want for headers because it stays in the flow until it needs to stick.

**3. Forgetting the positioning context for absolutely-placed children.**
If you position the search icon with `absolute` but forget `relative` on the parent div, the icon positions itself relative to the nearest *other* positioned ancestor (or the viewport). This leads to the icon flying off to some unexpected location. Always pair `absolute` children with a `relative` (or `sticky`/`fixed`) parent.

**4. Not setting `type="button"` on non-submit buttons.**
This bites people when buttons accidentally submit forms. The fix is simple: always add `type="button"` unless you genuinely want submit behavior. It's such a common gotcha that many linting rules enforce it.

**5. Overusing `z-index`.**
The `z-20` here is fine, but in large apps, z-index values can spiral out of control (you've probably seen codebases with `z-[9999]`). A common practice is to define a z-index scale in your Tailwind config or as CSS variables so the team agrees on layers.

---

## Mini exercises

### Exercise 1: Make the search input functional
Add an `onSearch` callback prop typed as `(query: string) => void`. Wire it to the input's `onChange` event so that every keystroke calls `onSearch` with the current input value. Bonus: wrap it in a `debounce` function so it only fires after the user stops typing for 300ms (you'll need to research debouncing or use a library like `lodash.debounce`).

### Exercise 2: Add a mobile search toggle
The search bar is hidden on mobile (`hidden md:block`). Add a search icon button that only appears on mobile (`md:hidden`) and, when clicked, expands the search input. You'll need to introduce `useState` to track whether the mobile search is open or closed. This exercise introduces you to React state management in a concrete way.

### Exercise 3: Add a notification count badge
Add an optional `notificationCount` prop (type: `number`). When it's greater than zero, render a small red circle with the count on top of the bell icon. You'll need `absolute` positioning on the badge relative to the button. Try classes like `absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center`.

---

## Further reading

- **MDN -- position: sticky:** https://developer.mozilla.org/en-US/docs/Web/CSS/position (scroll to the sticky section)
- **Tailwind CSS -- Responsive Design:** https://tailwindcss.com/docs/responsive-design
- **Tailwind CSS -- Arbitrary Values:** https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values
- **MDN -- ARIA labels:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label
- **Lucide Icons documentation:** https://lucide.dev/guide/packages/lucide-react
- **CSS backdrop-filter:** https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
