# Guide: Root Layout (layout.tsx)

**File:** `src/app/layout.tsx`

---

## Purpose

This is the root layout -- the outermost wrapper for every single page in the application. In Next.js App Router, layouts are special: they wrap their children and persist across navigation. When a user clicks from `/dashboard` to `/settings`, the root layout does not re-render. Only the inner content swaps out.

This file handles three responsibilities:

1. Loading custom fonts (Geist Sans and Geist Mono).
2. Setting page metadata (the browser tab title and description for search engines).
3. Providing the base HTML structure (`<html>` and `<body>` tags) with global styling applied.

Every page in OpsForge renders inside this layout. There is no escaping it.

---

## Line-by-Line Walkthrough

### Imports

```typescript
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
```

Three imports, each doing something different:

- `type { Metadata }` -- a TypeScript type from Next.js that describes the shape of page metadata (title, description, Open Graph tags, etc.). The `type` keyword means it's erased at build time and adds zero bytes to your bundle.
- `localFont` -- a function from Next.js's font system. It loads font files from your project directory (as opposed to fetching them from Google Fonts or another CDN). Local fonts are faster because there's no external network request.
- `"./globals.css"` -- importing a CSS file in JavaScript might look strange, but this is how bundlers work. This import tells the build system "include this stylesheet in the page." The `globals.css` file we covered in the previous guide gets loaded here.

### Font Loading

```typescript
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
```

Each `localFont()` call does several things behind the scenes:

- Reads the `.woff` font file from the specified path.
- Generates an optimized `@font-face` CSS rule.
- Creates a unique CSS class name that applies the font.
- Creates a CSS variable (specified by `variable`) that you can reference elsewhere.

`"VF"` in the filename stands for "Variable Font." A variable font is a single file that contains every weight from thin (100) to black (900), rather than requiring separate files for each weight. That's what `weight: "100 900"` declares -- the full range is available.

The `variable` option is the key connection to `globals.css`. Remember this line from that file?

```css
font-family: var(--font-geist-sans), "Segoe UI", sans-serif;
```

The `--font-geist-sans` CSS variable is created by the `localFont` call here. Next.js wires it up automatically when you add the variable class to the body (which we do below).

### Metadata

```typescript
export const metadata: Metadata = {
  title: "OpsForge",
  description: "Internal Operations Dashboard for NovaCom",
};
```

`metadata` is a special export that Next.js recognizes. When you export a `metadata` object from a layout or page file, Next.js automatically generates the appropriate `<head>` tags:

```html
<title>OpsForge</title>
<meta name="description" content="Internal Operations Dashboard for NovaCom" />
```

You don't write `<head>` or `<title>` tags manually. Next.js handles it. This is one of the benefits of the framework -- metadata management is declarative.

For an internal tool like OpsForge, the description matters less (no one is searching for it on Google), but setting the title is important so operators can find the right browser tab.

### The Layout Component

```typescript
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

Let's unpack this piece by piece.

**The function signature:**
- `{ children }` -- destructured from props. `children` is whatever page or nested layout Next.js renders inside this layout.
- `Readonly<{ children: React.ReactNode }>` -- the type annotation. `Readonly` makes the props immutable (a good practice for layout props since you should never mutate them). `React.ReactNode` means `children` can be any renderable React content: elements, strings, numbers, null, fragments, arrays.

**The `<html>` tag:**
- `lang="en"` -- tells browsers and screen readers the page content is in English. This is an accessibility requirement. Without it, screen readers might guess the wrong language and mispronounce everything.

**The `<body>` tag's `className`:**
- `${geistSans.variable}` -- adds the CSS class that makes `--font-geist-sans` available as a CSS variable. Without this class on the body, the variable would be undefined and the font wouldn't apply.
- `${geistMono.variable}` -- same for the monospace font.
- `bg-background` -- Tailwind class that sets `background-color` to the value of `--background` (defined in `globals.css`). This works because Tailwind is configured to map `background` to the CSS variable.
- `text-foreground` -- same pattern for text color.
- `antialiased` -- a Tailwind class that applies `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`. This makes text look smoother on most screens, especially macOS.

**`{children}`:**
- This is where every page in the app gets injected. When you navigate to `/dashboard`, the dashboard page component renders here. When you go to `/login`, the login page renders here. The layout stays; only the children change.

---

## Concepts Taught

- **Next.js App Router layouts:** How layouts wrap pages and persist across navigation.
- **Local font loading:** Using `next/font/local` to self-host fonts with automatic optimization.
- **Variable fonts:** A single font file covering multiple weights.
- **CSS variables from JavaScript:** How Next.js font loading bridges JS configuration and CSS variables.
- **Declarative metadata:** Exporting a `metadata` object instead of manually writing `<head>` tags.
- **`Readonly` type utility:** Making props immutable at the type level.
- **`React.ReactNode`:** The catch-all type for anything React can render.
- **Accessibility basics:** The `lang` attribute on `<html>`.
- **Template literals in className:** Using backtick strings to combine multiple class sources.

---

## Common Mistakes

1. **Forgetting to add the font variable class to the body.** If you load a font with `variable: "--font-geist-sans"` but never add `geistSans.variable` to any element's className, the CSS variable will never be defined and the font won't show up. You'll see the fallback font instead and might not realize why.

2. **Importing CSS in the wrong place.** `globals.css` should be imported in the root layout (or a top-level component). If you import it in a nested page, it will still work, but it might get loaded and unloaded during navigation, causing a flash of unstyled content.

3. **Adding interactive logic to the root layout.** This file is a Server Component by default (notice there's no `"use client"` at the top). You cannot use `useState`, `useEffect`, or event handlers here. If you need interactivity, it belongs in a Client Component that you import and nest inside the layout.

4. **Putting everything in the root layout.** The sidebar, header, and auth check live in `(app)/layout.tsx`, not here. The root layout should contain only what is truly universal -- HTML structure, fonts, and global styles. The login page, for example, doesn't need a sidebar.

5. **Duplicate `<html>` or `<body>` tags.** In Next.js App Router, only the root layout should have `<html>` and `<body>`. Nested layouts should not repeat them. Next.js will throw an error if you do.

---

## Mini Exercises

### Exercise 1: Add a third font
Download any `.woff2` font file (or use one you have), place it in `src/app/fonts/`, and load it using `localFont`. Add its variable class to the body. Then create a Tailwind utility or a quick inline style that uses it on a heading somewhere. Verify in DevTools that the font loads.

### Exercise 2: Experiment with metadata
Add an `icons` property to the metadata object:

```typescript
export const metadata: Metadata = {
  title: "OpsForge",
  description: "Internal Operations Dashboard for NovaCom",
  icons: { icon: "/favicon.ico" },
};
```

Open the page, view the page source (Ctrl+U), and find the generated `<link>` tag in the `<head>`. Try adding `openGraph` metadata too and see what tags appear.

### Exercise 3: Remove `antialiased` and compare
Remove the `antialiased` class from the body, save, and look at any text-heavy page. Take a screenshot. Add it back and take another screenshot. Compare them side by side, especially on a Mac or a high-DPI display. The difference is subtle but real.

---

## Further Reading

- **Next.js Layouts:** [Next.js Docs -- Layouts and Templates](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- **next/font:** [Next.js Docs -- Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- **Variable fonts:** [web.dev -- Introduction to variable fonts](https://web.dev/variable-fonts/)
- **Next.js Metadata API:** [Next.js Docs -- Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- **Server vs Client Components:** [Next.js Docs -- Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
