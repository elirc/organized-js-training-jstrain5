# Guide: globals.css

**File:** `src/app/globals.css`

---

## Purpose

This is the single stylesheet that sets the visual foundation for the entire application. Every page, every component, every piece of text you see is influenced by what happens in this file. It does three things:

1. Loads Tailwind CSS (the utility-class framework the project uses for styling).
2. Defines a set of custom color variables that automatically switch between light and dark mode.
3. Creates a handful of reusable utility classes (like `.panel` and `.badge`) so the team doesn't repeat the same cluster of Tailwind classes in dozens of components.

If you've ever wondered "where does the app get its colors?" or "why does dark mode just work?" -- this file is the answer.

---

## Line-by-Line Walkthrough

### Loading Tailwind

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

These three directives are not standard CSS. They are instructions to the Tailwind compiler. When your project builds, Tailwind replaces each directive with a big block of generated CSS:

- `base` -- resets browser defaults (margins, font sizes, etc.) so every browser starts from the same baseline.
- `components` -- a layer where Tailwind (or you) can define reusable component-level styles.
- `utilities` -- the thousands of small classes like `text-sm`, `p-4`, `rounded-lg` that you see scattered throughout every component file.

The order matters. Base loads first, then components, then utilities. This means utility classes will always win in a specificity battle, which is exactly what you want -- if you slap `text-red-500` on an element, it should override any broader rule.

### CSS Custom Properties (Light Mode)

```css
:root {
  --background: #f4f6fb;
  --foreground: #11131a;
  --surface: #ffffff;
  --surface-muted: #f0f3fa;
  --line: #d9dfef;
  --accent: #005ecb;
  --accent-soft: #e3f0ff;
  --danger: #b00020;
  --danger-soft: #ffe4e9;
}
```

`:root` targets the `<html>` element -- the very top of the document tree. Any variable defined here is available everywhere in the app via `var(--variable-name)`.

This is the light-mode palette. Notice the naming convention:

- `--background` and `--foreground` are the most basic pair: page background color and default text color.
- `--surface` is for cards and panels that sit on top of the background.
- `--surface-muted` is a slightly dimmed variant of surface, used for table headers and secondary areas.
- `--line` is for borders and dividers.
- `--accent` is the primary brand/action color (a strong blue).
- `--accent-soft` is a pale version of the accent, used for subtle highlights.
- `--danger` and `--danger-soft` follow the same pattern but for error/warning states.

### Dark Mode Override

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #090b12;
    --foreground: #f3f6ff;
    /* ... rest of dark values ... */
  }
}
```

`@media (prefers-color-scheme: dark)` is a media query that activates when the user's operating system is set to dark mode. When it kicks in, it redefines every single variable with darker values. Because the rest of the app references these variables by name (not by hardcoded hex value), everything switches automatically. No JavaScript. No toggle state. The browser handles it.

Notice the inversion pattern: `--background` goes from near-white (`#f4f6fb`) to near-black (`#090b12`), and `--foreground` does the opposite. The `--surface` values shift from white to dark navy. The accent color lightens so it stays readable against dark backgrounds.

### Body Styles

```css
body {
  color: var(--foreground);
  background: var(--background);
  font-family: var(--font-geist-sans), "Segoe UI", sans-serif;
}
```

This sets the three most fundamental visual properties for the entire page:

- Text color comes from `--foreground`.
- Background color comes from `--background`.
- The font stack tries Geist Sans first (a custom font loaded in `layout.tsx`), falls back to Segoe UI (the Windows system font), then to the browser's generic sans-serif.

`var(--font-geist-sans)` is a CSS variable that Next.js creates when you load a local font. You'll see how this is wired up when you read the `root-layout.guide.md`.

### Link Reset

```css
a { color: inherit; text-decoration: none; }
```

This strips the default blue-underline styling from all links. In a dashboard app like this, links are styled contextually (buttons, nav items, cards) rather than looking like traditional web links. `color: inherit` means "use whatever color your parent has."

### Custom Utility Classes

```css
@layer utilities {
  .panel { @apply rounded-lg border bg-[var(--surface)]; border-color: var(--line); }
  .panel-muted { @apply rounded-lg border bg-[var(--surface-muted)]; border-color: var(--line); }
  .text-dim { @apply text-sm text-slate-600 dark:text-slate-300; }
  .badge { @apply inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold; }
  .badge-safe { @apply bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200; }
  .badge-danger { @apply bg-[var(--danger-soft)] text-[var(--danger)]; }
}
```

`@layer utilities` tells Tailwind "put these classes in the utilities layer." This means they participate in Tailwind's specificity system and can be overridden the same way any utility class can.

`@apply` is Tailwind's way of saying "expand these utility classes inline." So `.panel` becomes a shorthand for "rounded corners, a border, white (or dark) background, and a specific border color."

Why do this instead of just writing `className="rounded-lg border bg-[var(--surface)]"` everywhere? Because `.panel` appears on dozens of components. If you ever need to change the border radius from `rounded-lg` to `rounded-xl`, you change it in one place instead of hunting through 30 files.

The bracket syntax `bg-[var(--surface)]` is Tailwind's "arbitrary value" feature -- it lets you use any CSS value, not just Tailwind's predefined options. Here it bridges Tailwind classes with our custom CSS variables.

---

## Concepts Taught

- **CSS Custom Properties (variables):** Defining a design token system with `--name: value` and consuming it with `var(--name)`.
- **Media queries for dark mode:** Using `prefers-color-scheme` to respond to OS-level preferences.
- **Tailwind directives:** `@tailwind base/components/utilities` and how the build process replaces them.
- **Tailwind layers:** `@layer utilities` for organizing custom classes within Tailwind's cascade.
- **`@apply` directive:** Composing Tailwind utilities into named CSS classes.
- **Arbitrary values in Tailwind:** The `bg-[var(--surface)]` bracket notation.
- **Design tokens:** The idea that colors have semantic names (`--danger`, `--accent`) rather than raw values, making theming possible.

---

## Common Mistakes

1. **Hardcoding hex colors instead of using variables.** If you write `bg-[#ffffff]` in a component instead of `bg-[var(--surface)]`, your component will look wrong in dark mode. Always use the variable.

2. **Forgetting that `@apply` only works at build time.** You can't use `@apply` in inline styles or in dynamically generated CSS. It's a compile-time feature.

3. **Defining classes outside `@layer`.** If you put `.panel` outside of `@layer utilities`, it won't participate in Tailwind's specificity ordering. It might get overridden by utilities when you don't expect it, or fail to override base styles when you need it to.

4. **Assuming dark mode is toggled by a class.** This project uses the media-query approach (`prefers-color-scheme`), not the class-based approach (where you'd add a `dark` class to `<html>`). If you see `dark:` prefixes in Tailwind classes and they're not working, check your `tailwind.config` to confirm which strategy is active.

5. **Not providing a fallback font.** The font stack `var(--font-geist-sans), "Segoe UI", sans-serif` degrades gracefully. If you only wrote `var(--font-geist-sans)` and the font failed to load, you'd get the browser's default serif font, which would look broken.

---

## Mini Exercises

### Exercise 1: Add a warning color pair
Add `--warning` and `--warning-soft` variables for both light and dark mode (think amber/yellow tones). Then create a `.badge-warning` utility class that uses them. Test it by temporarily adding `<span className="badge badge-warning">Degraded</span>` to any page.

### Exercise 2: Inspect the cascade
Open your browser's DevTools, inspect any element that uses the `.panel` class, and expand the "Computed" styles tab. Find the `background-color` property and trace it back through the cascade. Can you see where `var(--surface)` resolves to an actual hex value? Toggle your OS dark mode and watch it change.

### Exercise 3: Break it on purpose
Comment out the `@media (prefers-color-scheme: dark)` block, save, and switch your OS to dark mode. Notice how the page uses light-mode colors on a dark background (or vice versa). This demonstrates why the variable-override approach works -- and what happens when one side of it is missing.

---

## Further Reading

- **CSS Custom Properties:** [MDN -- Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- **prefers-color-scheme:** [MDN -- prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- **Tailwind CSS directives:** [Tailwind Docs -- Functions & Directives](https://tailwindcss.com/docs/functions-and-directives)
- **Design tokens:** [Smashing Magazine -- Design Tokens](https://www.smashingmagazine.com/2019/12/design-tokens-css/) (the concept behind naming colors semantically)
- **Tailwind arbitrary values:** [Tailwind Docs -- Using arbitrary values](https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values)
