# Guide: tailwind.config.ts

> **File:** `tailwind.config.ts` (project root)
> **Role:** Configures Tailwind CSS -- tells it where to scan for class usage, extends the default theme, and registers plugins.

---

## Purpose

Tailwind CSS is a "utility-first" CSS framework. Instead of writing CSS like `.card { padding: 1rem; border-radius: 0.5rem; }`, you apply utility classes directly in your HTML/JSX: `<div className="p-4 rounded-lg">`.

But Tailwind has a problem: it ships with *thousands* of utility classes. If you included them all, your CSS bundle would be enormous. So Tailwind uses a build step to scan your source files, find which classes you actually use, and only include those in the final CSS.

This config file tells Tailwind:
1. Which files to scan for class names.
2. How to customize the design system (colors, spacing, fonts, etc.).
3. What plugins to load.

---

## Line-by-Line Walkthrough

```typescript
import type { Config } from "tailwindcss";
```

A type-only import. This gives us TypeScript autocompletion and validation for the config object. The `import type` syntax means "I only need this for type checking; don't include it in the output." Notice the config file itself is TypeScript (`.ts`), not JavaScript -- Tailwind supports both.

```typescript
const config: Config = {
```

We declare a `config` variable typed as Tailwind's `Config` type. This gives you autocomplete in your editor when you're editing the config. If you typo a property name, TypeScript catches it.

### Content (The Most Important Setting)

```typescript
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
```

**This is where Tailwind looks for class names.** Each string is a glob pattern:

- `./src/pages/**/*.{js,ts,jsx,tsx,mdx}` -- All JS/TS/MDX files under `src/pages/`, at any depth.
- `./src/components/**/*.{js,ts,jsx,tsx,mdx}` -- All files under `src/components/`.
- `./src/app/**/*.{js,ts,jsx,tsx,mdx}` -- All files under `src/app/`.

The `**` means "any number of subdirectories." The `{js,ts,jsx,tsx,mdx}` means "files with any of these extensions."

Tailwind reads these files as plain text and looks for strings that match its class names. If it finds `bg-blue-500` anywhere in these files, that class gets included in the CSS output. If no file mentions `bg-blue-500`, it gets excluded (tree-shaken).

**An important gotcha here:** This project uses the Next.js App Router, so most code lives in `src/app/`. The `src/pages/` entry is there as a holdover from the default Next.js template (which supports both routers). It's not hurting anything, but it's scanning a directory that may not exist. Not a bug, just slightly untidy.

Also worth noting: if you have utility files outside these three directories that contain Tailwind classes (say, a helper in `src/lib/` that returns class strings), those classes won't be detected. You'd need to add `"./src/lib/**/*.{js,ts,jsx,tsx}"` to the content array.

### Theme

```typescript
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
```

The `theme` block customizes Tailwind's design system. There's a critical distinction here:

- `theme: { colors: { ... } }` -- **Replaces** all of Tailwind's default colors.
- `theme: { extend: { colors: { ... } } }` -- **Adds to** Tailwind's default colors.

We use `extend`, so all of Tailwind's built-in colors (`red-500`, `blue-300`, `gray-100`, etc.) still work. We're just adding two more.

The two custom colors use **CSS custom properties** (CSS variables):

- `background: "var(--background)"` -- Creates a Tailwind color called `background` that reads its value from the CSS variable `--background`.
- `foreground: "var(--foreground)"` -- Same pattern for text/foreground color.

This means you can use `bg-background` and `text-foreground` in your JSX. The actual color values are defined elsewhere (typically in `globals.css`) using CSS:

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}
```

Why use CSS variables instead of hardcoded hex values? **Theming.** You can swap `--background` to `#0a0a0a` for dark mode, and every `bg-background` class updates automatically without touching Tailwind config.

### Plugins

```typescript
  plugins: [],
```

No plugins are registered. Tailwind has an ecosystem of plugins for things like forms styling (`@tailwindcss/forms`), typography (`@tailwindcss/typography`), and animations. This project doesn't use any -- it gets by with the built-in utilities and the component libraries (CVA, clsx, tailwind-merge) listed in `package.json`.

### Export

```typescript
};
export default config;
```

The config is exported as the default export. Tailwind's build process imports this file to get the configuration. The `export default` is required.

---

## Concepts Taught

1. **Utility-first CSS** -- Writing styles as class names (`p-4`, `text-lg`, `bg-blue-500`) instead of in separate CSS files.
2. **Content scanning (tree-shaking)** -- Tailwind only includes CSS for classes it finds in your source files. If it's not in a scanned file, it doesn't exist in the output.
3. **Extending vs. replacing the theme** -- `theme.extend` adds to defaults; `theme` at the top level replaces them. A subtle but important distinction.
4. **CSS custom properties for theming** -- Using `var(--name)` to make colors dynamic and theme-able.
5. **Glob patterns** -- The `**/*.{ts,tsx}` syntax for matching files. You'll see this pattern in many config files.

---

## Common Mistakes

1. **Building class names dynamically and wondering why they don't work.**

   ```tsx
   // BROKEN - Tailwind can't see this at build time
   const color = "blue";
   return <div className={`bg-${color}-500`} />;

   // WORKS - Full class name is visible in the source
   const bgClass = isActive ? "bg-blue-500" : "bg-gray-500";
   return <div className={bgClass} />;
   ```

   Tailwind scans files as plain text. It can't execute JavaScript to figure out that `bg-${color}-500` becomes `bg-blue-500`. The full class name string must appear literally somewhere in a scanned file.

2. **Forgetting to add a directory to `content`.** If you put a React component in `src/utils/` and it uses Tailwind classes, those classes won't be in the CSS output because `src/utils/` isn't in the content array.

3. **Using `theme` instead of `theme.extend` and losing all default colors.** If you write `theme: { colors: { primary: '#3b82f6' } }`, you've just told Tailwind "the ONLY color is primary." All built-in colors disappear. Always use `extend` unless you truly want to replace the entire palette.

4. **Not realizing the config file runs at build time.** This file is processed by PostCSS during the build. You can't access runtime values like `window` or browser APIs here. CSS variables are the bridge between build-time config and runtime values.

5. **Committing unused content paths.** The `./src/pages/` path in this project scans a directory that may not exist or be empty. It doesn't cause errors, but it's sloppy. In a code review, this would be worth cleaning up.

---

## Mini Exercises

### Exercise 1: Add a Custom Color
Add a new color called `accent` that uses a CSS variable `--accent`. Then use `bg-accent` on any element in the app.

<details>
<summary>Solution</summary>

In `tailwind.config.ts`, inside `extend.colors`:

```typescript
colors: {
  background: "var(--background)",
  foreground: "var(--foreground)",
  accent: "var(--accent)",
},
```

Then define the variable in your `globals.css`:

```css
:root {
  --accent: #3b82f6;
}
```

Now `bg-accent`, `text-accent`, `border-accent`, etc. all work.
</details>

### Exercise 2: Find a Missing Scan Path
Look at the project structure. Is there any directory under `src/` that contains files using Tailwind classes but isn't listed in the `content` array? (Hint: check `src/lib/` for any files that return JSX or class name strings.)

<details>
<summary>Solution</summary>

Check files in `src/lib/` -- if any of them export strings containing Tailwind classes (like a `cn()` utility that builds class names), those classes are technically not scanned. In practice, these utility functions typically combine classes that are *also* used in component files (which are scanned), so it works out. But if you had a file in `src/lib/` that was the *only* place a class appeared, it would be silently dropped.
</details>

### Exercise 3: Test Tree-Shaking
Add `className="bg-fuchsia-900"` to any component. Run `npm run build`. Then search the CSS output in `.next/static/css/` for "fuchsia." Remove the class, rebuild, and search again. Is it gone?

<details>
<summary>Hint</summary>

After building, look in `.next/static/css/` for the generated CSS file. Use your editor's search or `grep` to find "fuchsia." This demonstrates that Tailwind only includes what you use.
</details>

---

## Further Reading

- [Tailwind CSS documentation](https://tailwindcss.com/docs) -- Excellent docs. Searchable, with examples for every utility class.
- [Content configuration](https://tailwindcss.com/docs/content-configuration) -- Deep dive into how Tailwind scans for classes and how to configure it.
- [Customizing colors](https://tailwindcss.com/docs/customizing-colors) -- All the ways to define and extend the color palette.
- [Using CSS variables with Tailwind](https://tailwindcss.com/docs/customizing-colors#using-css-variables) -- The pattern this config uses for `background` and `foreground`.
- [Tailwind CSS IntelliSense (VS Code extension)](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) -- Gives you autocomplete for Tailwind classes in your editor. Highly recommended.
