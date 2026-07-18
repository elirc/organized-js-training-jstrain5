# Guide: PlaceholderView Component

**Source file:** `src/components/placeholder-view.tsx`

---

## Purpose

`PlaceholderView` is a temporary stand-in component. When you're building a large application, you don't build every page at once. Instead, you wire up the routing and navigation first, then drop a placeholder into each page that says "this route works, content is coming later." That's exactly what this component does.

This is a real production pattern. You'll see it called "stub pages," "skeleton views," or "coming soon" components in other codebases. The reason it's worth studying isn't because the code is complex -- it's because it teaches you how to think about **incremental delivery** and **default prop values**.

---

## Line-by-line walkthrough

```typescript
type PlaceholderViewProps = {
  title: string;
  description: string;
  readiness?: "foundation" | "scaffolded";
};
```

The props type has something new compared to KpiCard: a **union type** for `readiness`. The `?` makes it optional, and `"foundation" | "scaffolded"` means the value must be exactly one of those two strings -- nothing else. TypeScript will give you an error if you pass `readiness="ready"` or `readiness="done"`.

This is called a **string literal union**, and it's one of TypeScript's most practical features. Instead of accepting any string and hoping the caller gets it right, you enumerate the exact valid options. Your editor will even autocomplete them for you.

Why these two values? In this project's development phases, "foundation" means the route exists and is structurally in place, and "scaffolded" means some UI scaffolding is done but the real business logic hasn't been implemented yet.

```typescript
export function PlaceholderView({ title, description, readiness = "scaffolded" }: PlaceholderViewProps) {
```

Notice `readiness = "scaffolded"` in the destructuring. This is a **default parameter value**. If the parent component doesn't pass a `readiness` prop, it defaults to `"scaffolded"`. This works together with the `?` in the type definition: the prop is optional to pass in, but inside the function it always has a value.

This is a subtle but important distinction:
- `readiness?: "foundation" | "scaffolded"` -- the caller may omit it (TypeScript concern).
- `readiness = "scaffolded"` -- if omitted, use this value (JavaScript runtime concern).

Both pieces work together to create a clean API.

```typescript
  return (
    <section className="space-y-4">
```

The outermost element is a `<section>`, which is semantically more appropriate than a generic `<div>` since this represents a distinct section of the page. `space-y-4` is a Tailwind utility that adds vertical spacing (1rem) between direct child elements. It's equivalent to giving every child except the first a `margin-top: 1rem`. This is one of the most useful Tailwind utilities -- it saves you from manually adding margins to individual children.

```typescript
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-dim mt-1">{description}</p>
      </div>
```

A wrapper div groups the title and description together. `text-xl font-bold` on the heading makes it prominent. `text-dim` is a custom utility class defined somewhere in the project's Tailwind config or global CSS -- it probably maps to a muted text color that respects the current theme (light or dark mode). `mt-1` gives the description a small top margin (0.25rem) so it doesn't sit flush against the heading.

```typescript
      <div className="panel p-5">
        <p className="text-sm">
          This page is wired into the OpsForge app shell and route tree. Domain logic and tables will be
          layered in subsequent phases.
        </p>
```

The `panel` class (same one KpiCard uses) creates a bordered card. The message inside is hardcoded -- it's literally a note to anyone viewing the app that says "this page exists, the real stuff is coming." This is perfectly fine for a placeholder. Over-engineering a throwaway component is a waste of time.

```typescript
        <p className="mt-3 text-xs text-slate-500">
          Readiness:{" "}
```

`{" "}` is a JSX trick for inserting an explicit space character. In regular HTML, whitespace between inline elements is preserved. But in JSX, whitespace between elements on separate lines is often collapsed or removed. Writing `{" "}` guarantees there's a visible space between "Readiness:" and the badge that follows. You'll see this pattern throughout React codebases.

```typescript
          <span className={readiness === "foundation" ? "badge badge-safe" : "badge bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"}>
            {readiness}
          </span>
```

Here's the most interesting line in the component. The `className` is computed with a ternary:

- If `readiness` is `"foundation"`, use `"badge badge-safe"` (probably a green-tinted badge indicating this feature has a solid base).
- Otherwise (i.e., `"scaffolded"`), use a longer string of utility classes that produces a neutral gray badge with dark mode support.

The `dark:` prefix in Tailwind classes means "apply this class only when dark mode is active." So `dark:bg-slate-800 dark:text-slate-100` gives the badge a dark background with light text in dark mode.

`badge` and `badge-safe` are custom classes in this project. You'd find their definitions in the global CSS or Tailwind plugin configuration.

Notice this: the ternary works correctly here because there are only two possible values. If `readiness` had three or more options, a ternary would become unreadable and you'd want to use a lookup object or a helper function instead.

```typescript
        </p>
      </div>
    </section>
  );
}
```

Close everything up. The component is done.

---

## Concepts taught

1. **String literal union types** -- restricting a prop to specific exact values rather than any string.
2. **Default parameter values** -- providing a fallback when an optional prop is not passed.
3. **How `?` (optional) and `= defaultValue` work together** -- the TypeScript side vs the runtime side.
4. **Semantic HTML** -- choosing `<section>` over `<div>` when the element represents a meaningful region.
5. **Tailwind `space-y` utility** -- automatic spacing between children without manual margins.
6. **Explicit whitespace in JSX** -- the `{" "}` pattern for reliable spacing.
7. **Dark mode with Tailwind** -- the `dark:` variant prefix.
8. **Placeholder / stub components as a development strategy** -- building the skeleton of an app before filling in the details.

---

## Common mistakes

**1. Forgetting the default value when the type is optional.**
If you mark `readiness` as optional with `?` but don't provide a default with `= "scaffolded"`, then `readiness` could be `undefined` inside the function. That would make the ternary evaluate to the "scaffolded" branch (since `undefined === "foundation"` is false), which happens to produce the correct result by accident -- but relying on accidental correctness is a maintenance nightmare. Always be intentional.

**2. Using a plain string type when you have a known set of values.**
If `readiness` were typed as `string` instead of `"foundation" | "scaffolded"`, you'd lose autocomplete, you'd lose compile-time checking, and you'd open the door to typos like `"foundaiton"` that silently produce the wrong badge. Use literal unions when you know all the valid options.

**3. Hardcoding text that should be configurable.**
The paragraph "This page is wired into the OpsForge app shell..." is hardcoded. For a throwaway placeholder, that's fine. But if you were building a reusable "empty state" component meant to last, you'd want that text to be a prop. Knowing when hardcoding is acceptable (temporary code) vs when it's technical debt (permanent code) is a judgment call that comes with experience.

**4. Long class strings becoming unreadable.**
The badge class string for the "scaffolded" case is quite long. In a production codebase you might extract that into a variable, use the `cn()` utility, or define a custom Tailwind component class. It's not wrong as-is, but once a className string gets past ~80 characters, it starts to hurt readability.

---

## Mini exercises

### Exercise 1: Add a third readiness level
Add `"complete"` as a third option in the union type. Give it a blue-tinted badge (try `badge bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`). You'll need to convert the ternary to either nested ternaries (ugly, not recommended) or a lookup object. Try the lookup approach:
```typescript
const badgeClass: Record<string, string> = {
  foundation: "badge badge-safe",
  scaffolded: "badge bg-slate-100 ...",
  complete: "badge bg-blue-100 ...",
};
```
Then use `badgeClass[readiness]` in the className.

### Exercise 2: Make the message customizable
Replace the hardcoded paragraph text with an optional `message` prop. When not provided, fall back to the current hardcoded string using a default value. This lets individual pages provide context-specific placeholder messages while keeping the default for pages that don't need a custom one.

### Exercise 3: Add a timestamp
Add an optional `lastUpdated` prop typed as `string`. When provided, render it below the readiness badge as small muted text like "Last updated: Feb 2026". Think about where it goes in the JSX hierarchy and what Tailwind classes you'd use to keep it visually subtle.

---

## Further reading

- **TypeScript Handbook -- Literal Types:** https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types
- **TypeScript Handbook -- Narrowing:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- **Tailwind CSS -- Dark Mode:** https://tailwindcss.com/docs/dark-mode
- **Tailwind CSS -- Space Between:** https://tailwindcss.com/docs/space
- **MDN -- HTML section element:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/section
- **Incremental delivery in frontend development:** (search for "vertical slicing frontend" or "walking skeleton pattern")
