# Guide: tsconfig.json

> **File:** `tsconfig.json` (project root)
> **Role:** Configures the TypeScript compiler. Controls what TypeScript checks, how it resolves imports, and what JavaScript features are available.

---

## Purpose

TypeScript doesn't just work out of the box -- it needs to know the rules. `tsconfig.json` is where you define those rules. It answers questions like:

- How strict should type checking be?
- What kind of JavaScript should TypeScript output?
- Where does TypeScript look for files?
- How should `import` statements be resolved?

For a Next.js project, many of these settings are dictated by the framework. You don't pick them from scratch; Next.js tells you what it needs, and this file records that configuration.

---

## Line-by-Line Walkthrough

### The `compilerOptions` Block

This is where all the important settings live.

```json
"lib": ["dom", "dom.iterable", "esnext"],
```

**What built-in types are available?** This tells TypeScript which global APIs to know about:
- `"dom"` -- Browser APIs like `document`, `window`, `fetch`, `HTMLElement`.
- `"dom.iterable"` -- Makes DOM collections (like `NodeList`) iterable with `for...of`.
- `"esnext"` -- The latest JavaScript standard library features (`Array.at()`, `Promise.any()`, etc.).

Without `"dom"`, TypeScript wouldn't know what `document.getElementById` is. Without `"esnext"`, modern JS methods would show type errors.

```json
"allowJs": false,
```

**Can we use `.js` files?** No. This project is TypeScript-only. Every file must be `.ts` or `.tsx`. This is a deliberate choice that enforces consistency -- no sneaking in untyped JavaScript files.

```json
"skipLibCheck": true,
```

**Should TypeScript check types inside `node_modules`?** No, skip them. This dramatically speeds up compilation. Without it, TypeScript would crawl through every type definition in every installed package, including ones with known (but harmless) type errors. In practice, everyone turns this on.

```json
"strict": true,
```

**Enable all strict type-checking options.** This is the single most important line. It's a shorthand that turns on a whole family of checks:
- `strictNullChecks` -- `null` and `undefined` aren't assignable to other types without explicit handling.
- `strictFunctionTypes` -- Function parameter types are checked more carefully.
- `strictBindCallApply` -- `bind`, `call`, and `apply` are type-checked.
- `noImplicitAny` -- You can't accidentally leave a variable as `any`.
- `noImplicitThis` -- `this` must have a known type.
- And several others.

If you take away one thing from this guide: **always use `strict: true` in new projects.** It catches real bugs. Yes, it makes the compiler more demanding. That's the point.

```json
"noEmit": true,
```

**Don't output any JavaScript files.** This sounds weird -- isn't the whole point to compile TypeScript to JavaScript? Yes, but Next.js handles that compilation itself (using SWC, a fast Rust-based compiler). TypeScript's only job here is *type checking*. It reads your code, reports errors, and produces no output.

```json
"esModuleInterop": true,
```

**Make CommonJS and ES module imports play nice.** Without this, importing a CommonJS module (like many Node.js packages) requires awkward syntax: `import * as thing from 'thing'`. With it, you can just write `import thing from 'thing'`. Always enable this.

```json
"module": "esnext",
```

**What module system does the output use?** `"esnext"` means ES modules (`import`/`export`). Since `noEmit` is true, this mostly affects how TypeScript *understands* your imports rather than what it *outputs*.

```json
"moduleResolution": "bundler",
```

**How should TypeScript find modules when you `import` them?** `"bundler"` is the modern strategy designed for projects that use a bundler (like Next.js with Webpack/Turbopack). It understands `package.json` `"exports"` fields, conditional imports, and other modern Node.js resolution features.

The older alternatives are `"node"` (for traditional Node.js `require()`) and `"node16"` (for Node.js ES modules). `"bundler"` is the right choice for Next.js.

```json
"resolveJsonModule": true,
```

**Allow importing `.json` files.** Without this, `import data from './data.json'` would be a type error. With it, TypeScript understands the JSON structure and gives you proper types.

```json
"isolatedModules": true,
```

**Treat each file as an independent module.** This restricts some TypeScript features that require whole-program analysis (like `const enum` across files). It's required because Next.js compiles files individually with SWC -- it doesn't see your whole project at once the way the full TypeScript compiler does. If you write code that only works with whole-program compilation, this flag catches it early.

```json
"jsx": "preserve",
```

**How should JSX be handled?** `"preserve"` means "leave JSX syntax alone; don't transform it." TypeScript passes the JSX through as-is, and Next.js (via SWC) handles converting it to `React.createElement` calls (or the modern JSX transform). This is the standard setting for Next.js.

```json
"incremental": true,
```

**Cache type-checking results between runs.** TypeScript stores a `.tsbuildinfo` file so it doesn't re-check files that haven't changed. Makes `tsc` faster on subsequent runs. Free performance -- always enable it.

```json
"plugins": [{ "name": "next" }],
```

**Load the Next.js TypeScript plugin.** This gives your editor (VS Code, etc.) extra intelligence specific to Next.js. It validates things like `metadata` exports in page files, the shape of `generateStaticParams`, and other Next.js conventions. This doesn't affect compilation -- it only affects the editor experience.

```json
"paths": { "@/*": ["./src/*"] }
```

**Path alias.** This is a big quality-of-life feature. Instead of writing relative imports like:

```typescript
import { db } from "../../../lib/db";
```

You can write:

```typescript
import { db } from "@/lib/db";
```

`@/*` maps to `./src/*`, so `@/lib/db` resolves to `./src/lib/db`. This makes imports cleaner and means you don't have to count `../` levels when moving files around. Next.js understands this alias natively, so it works in both the compiler and at runtime.

### The `include` Array

```json
"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
```

**What files should TypeScript process?**
- `"next-env.d.ts"` -- A file Next.js auto-generates that sets up global type references. Don't edit it.
- `"**/*.ts"`, `"**/*.tsx"` -- All TypeScript files in the project.
- `".next/types/**/*.ts"` -- Types that Next.js generates for things like route parameters. These live in the `.next` build directory.

### The `exclude` Array

```json
"exclude": ["node_modules"]
```

**What should TypeScript ignore?** `node_modules` contains thousands of files. TypeScript shouldn't try to process them directly (that's what `skipLibCheck` handles for type definitions). This is technically the default, but being explicit is good practice.

---

## Concepts Taught

1. **Strict mode and why it matters** -- `strict: true` is the single most impactful TypeScript setting. It prevents entire categories of bugs.
2. **The separation between type-checking and compilation** -- TypeScript checks types; Next.js/SWC does the actual compilation. `noEmit: true` makes this explicit.
3. **Module resolution strategies** -- How TypeScript finds the file behind `import { thing } from 'somewhere'`.
4. **Path aliases** -- Using `@/` instead of relative paths for cleaner, more maintainable imports.
5. **Incremental compilation** -- Caching previous results to speed up repeated builds.

---

## Common Mistakes

1. **Turning off `strict` because of type errors.** When you encounter a type error, the fix is to handle the type correctly, not to weaken the compiler. If a function might return `null`, check for `null`. That check prevents a runtime crash.

2. **Editing `next-env.d.ts`.** This file says "DO NOT EDIT" at the top. Next.js regenerates it. Any changes you make will be overwritten.

3. **Confusing `paths` in `tsconfig.json` with actual runtime resolution.** The `paths` setting only tells TypeScript how to resolve imports for type-checking. You also need your bundler (Next.js, in our case) to understand the same aliases. Next.js does this automatically, but other tools (Jest, for example) need separate configuration.

4. **Adding `"target"` when using Next.js.** You might see tutorials include `"target": "es2017"` or similar. In this project, it's absent because Next.js controls the compilation target. Adding it here would be misleading -- TypeScript isn't doing the compilation (`noEmit: true`), so `target` is largely irrelevant.

5. **Not understanding `isolatedModules`.** If you write `export const enum Direction { Up, Down }` and use it across files, TypeScript will complain. This is because SWC compiles each file in isolation and can't inline const enums from other files. Use regular `enum` or union types instead.

---

## Mini Exercises

### Exercise 1: Break Strict Mode (on Purpose)
Create a temporary file `src/test-strict.ts` with this code:

```typescript
function greet(name) {
  return "Hello, " + name;
}
```

What error does TypeScript show? Why? (Hint: think about what `strict: true` enables.)

<details>
<summary>Solution</summary>

TypeScript reports: `Parameter 'name' implicitly has an 'any' type.`

This is because `strict: true` enables `noImplicitAny`. TypeScript refuses to guess the type of `name`. The fix is: `function greet(name: string)`. Delete the test file when you're done.
</details>

### Exercise 2: Try Removing the Path Alias
In any file that uses `@/` imports, change one import to use a relative path instead. For example, change `import { db } from "@/lib/db"` to `import { db } from "../../../lib/db"` (adjust the depth to match). Does it still work? Which version is easier to read?

<details>
<summary>Solution</summary>

Both work identically. The `@/` alias is purely a convenience. But notice how the relative path is fragile -- if you move the file to a different directory, the `../` count changes. The `@/` version always works because it's anchored to `src/`.
</details>

### Exercise 3: Inspect the Generated Types
Run `npm run build`, then look inside `.next/types/`. What files did Next.js generate? Open one and see what types it created for your routes.

<details>
<summary>Hint</summary>

After building, explore `.next/types/app/`. You should see files that correspond to your route segments, with types for `params`, `searchParams`, and other Next.js conventions. These are the types referenced by the `".next/types/**/*.ts"` include pattern.
</details>

---

## Further Reading

- [TypeScript tsconfig reference](https://www.typescriptlang.org/tsconfig) -- Official docs for every compiler option. Searchable and well-organized.
- [Next.js TypeScript docs](https://nextjs.org/docs/basic-features/typescript) -- How Next.js integrates with TypeScript and what settings it requires.
- [Understanding `strict` mode](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness) -- What each sub-flag does.
- [Module resolution in TypeScript](https://www.typescriptlang.org/docs/handbook/modules/theory.html) -- Deep dive into how `import` statements get resolved.
- [SWC vs tsc](https://nextjs.org/docs/architecture/nextjs-compiler) -- Why Next.js uses SWC instead of the TypeScript compiler for transpilation.
