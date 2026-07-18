# Guide: package.json

> **File:** `package.json` (project root)
> **Role:** The manifest file for the entire project. npm reads this to know what to install, what scripts to run, and basic metadata about your app.

---

## Purpose

Every Node.js project has a `package.json`. Think of it as the project's ID card and instruction manual rolled into one. It tells npm (the package manager) three critical things:

1. **Who is this project?** (name, version, visibility)
2. **What commands can I run?** (scripts)
3. **What libraries does it need?** (dependencies and devDependencies)

Without this file, `npm install` has nothing to work with, and none of the `npm run ___` commands exist.

---

## Line-by-Line Walkthrough

### Metadata Block

```json
{
  "name": "jstrain5",
  "version": "0.1.0",
  "private": true,
```

- **`name`**: The project's name. This matters if you ever publish to npm (we won't). It must be lowercase with no spaces.
- **`version`**: Follows [semver](https://semver.org/) format: `major.minor.patch`. `0.1.0` signals "this is early, pre-release work." Honest versioning -- we are not pretending this is a polished v1.
- **`private: true`**: A safety net. This prevents you from accidentally running `npm publish` and pushing your code to the public npm registry. Always set this for apps (as opposed to libraries you intend to share).

### Scripts Block

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "tsx src/lib/db/seed.ts",
    "worker": "tsx worker/index.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
```

Scripts are shortcuts. Instead of typing the full command, you type `npm run <name>`. Let's break each one down:

| Script | What it does | When you use it |
|---|---|---|
| `dev` | Starts the Next.js development server with hot reload | Every day during development |
| `build` | Creates an optimized production bundle | Before deploying, or to check for build errors |
| `start` | Serves the production bundle built by `build` | In production (or to test the production build locally) |
| `lint` | Runs ESLint via Next.js to catch code quality issues | Before committing, or in CI |
| `seed` | Runs a TypeScript file that populates the database with fake data | After a fresh `db:migrate`, or when you want to reset test data |
| `worker` | Starts the background job worker (BullMQ) | Alongside `dev` when you need job processing |
| `db:generate` | Tells Drizzle Kit to look at your schema and generate SQL migration files | After you change `schema.ts` |
| `db:migrate` | Applies pending migration files to your actual database | After `db:generate`, or on a fresh database |
| `db:studio` | Opens Drizzle Studio, a browser-based GUI for inspecting your database | When you want to poke around the DB without writing SQL |

Notice that `dev`, `build`, `start`, and `lint` use just the bare command name because Next.js registers its own CLI. The `seed` and `worker` scripts use `tsx`, a tool that lets you run TypeScript files directly without a separate compile step.

The `db:*` convention (using colons) is just a naming pattern to group related commands visually. npm doesn't treat the colon specially.

### Dependencies

```json
  "dependencies": {
    "@faker-js/faker": "^9.9.0",
    "@tanstack/react-query": "^5.66.0",
    "@tanstack/react-table": "^8.21.2",
    "bullmq": "^5.48.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "drizzle-orm": "^0.44.5",
    "ioredis": "^5.8.2",
    "lucide-react": "^0.511.0",
    "next": "14.2.15",
    "next-auth": "5.0.0-beta.25",
    "pg": "^8.16.3",
    "react": "^18",
    "react-dom": "^18",
    "recharts": "^3.2.1",
    "tailwind-merge": "^3.3.1",
    "zod": "^4.1.11",
    "zustand": "^5.0.8"
  },
```

These are **runtime** dependencies -- code that ships with your app or is needed while it runs. Grouped by role:

**Framework:**
- `next` -- The React meta-framework. Handles routing, server-side rendering, API routes, bundling, and more. Notice it's pinned to an exact version (`14.2.15`, no `^`). This is intentional -- Next.js upgrades can introduce breaking changes, so you want to control when that happens.
- `react`, `react-dom` -- The UI library. `react` is the core; `react-dom` is the part that talks to the browser DOM.

**Data fetching and state:**
- `@tanstack/react-query` -- Manages server state (caching API responses, refetching, loading/error states). You'll see this wrapping most of our data-fetching hooks.
- `zustand` -- Client-side state management. Simpler than Redux, with less boilerplate.

**Database:**
- `drizzle-orm` -- A TypeScript-first ORM. You write your schema in TypeScript and it generates SQL.
- `pg` -- The low-level PostgreSQL driver. Drizzle uses this under the hood to actually talk to Postgres.

**Background jobs:**
- `bullmq` -- A Redis-based job queue. Used for things that shouldn't block a web request (sending emails, running simulations, etc.).
- `ioredis` -- The Redis client library. BullMQ needs this, and we use it directly in some places too.

**Auth:**
- `next-auth` -- Authentication library for Next.js. Note the `5.0.0-beta.25` version -- this is a *beta*. That's worth being aware of. Beta dependencies can have breaking changes between minor versions. This project chose it because v5 has first-class App Router support.

**UI helpers:**
- `tailwind-merge` -- Smartly merges Tailwind CSS classes (so `p-2` and `p-4` don't conflict).
- `clsx` -- Conditionally joins class names together. Often used with `tailwind-merge`.
- `class-variance-authority` (CVA) -- Helps build component variants (like a Button that can be "primary", "secondary", "destructive").
- `lucide-react` -- Icon library. Clean, consistent SVG icons as React components.
- `recharts` -- Chart library built on D3. Used for our dashboard visualizations.

**Validation and utilities:**
- `zod` -- Runtime schema validation. Validates data coming from forms, APIs, environment variables.
- `date-fns` -- Date utility library. Lightweight alternative to Moment.js.
- `@faker-js/faker` -- Generates realistic fake data. Used in our seed script. Honestly, this arguably belongs in `devDependencies` since you wouldn't want it in production, but it works fine here and our seed script imports it at runtime.

**A note on the `^` symbol:**
The `^` (caret) means "compatible with." `^5.66.0` means "install 5.66.0 or any newer version that doesn't change the major number" (so 5.67.0 is okay, 6.0.0 is not). This is the default behavior when you `npm install` something. The exact versions that actually got installed are locked in `package-lock.json`.

### Dev Dependencies

```json
  "devDependencies": {
    "@types/pg": "^8.15.6",
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "drizzle-kit": "^0.31.4",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "eslint": "^8",
    "eslint-config-next": "14.2.15",
    "tsx": "^4.20.6"
  }
```

These are **development-only** dependencies. They help you write code but don't ship to users.

- **`@types/*`** -- TypeScript type definitions for libraries that don't include their own. `pg` is written in JavaScript, so `@types/pg` tells TypeScript what its functions look like.
- **`typescript`** -- The TypeScript compiler itself.
- **`drizzle-kit`** -- The CLI tool for Drizzle (generates migrations, runs studio). Separate from `drizzle-orm` because you only need the CLI during development.
- **`postcss`**, **`tailwindcss`** -- Tailwind CSS and its build tool. PostCSS transforms your CSS at build time; Tailwind is a PostCSS plugin.
- **`eslint`**, **`eslint-config-next`** -- Linter and Next.js-specific linting rules.
- **`tsx`** -- TypeScript execute. Lets you run `.ts` files directly without compiling first. Used by our `seed` and `worker` scripts.

---

## Concepts Taught

1. **Semver (Semantic Versioning)** -- The `major.minor.patch` convention and what `^` means for version ranges.
2. **dependencies vs. devDependencies** -- Runtime code vs. development tooling. In practice, for a Next.js app (which bundles everything), the distinction matters less than for a published library. But it's still good hygiene.
3. **npm scripts as project-specific commands** -- A central place for all the "how do I run this?" answers.
4. **Pinning vs. floating versions** -- Why `next` is pinned exactly while most other packages use `^`.
5. **The role of `private: true`** -- Preventing accidental publishes.

---

## Common Mistakes

1. **Installing something in the wrong section.** Running `npm install some-tool` puts it in `dependencies`. If it's a dev-only tool, use `npm install --save-dev some-tool` (or `npm i -D some-tool`). Getting this wrong won't break your app, but it inflates production installs.

2. **Editing `package-lock.json` by hand.** Never do this. The lock file is auto-generated. If you have merge conflicts in it, delete it and run `npm install` to regenerate it.

3. **Forgetting `npm install` after pulling.** If a teammate adds a dependency and you pull their changes, you need to run `npm install` again. You'll get mysterious "module not found" errors otherwise.

4. **Using `npm run start` without building first.** `next start` serves the production build, but you need to `npm run build` first. In development, use `npm run dev`.

5. **Ignoring beta version warnings.** `next-auth` is at `5.0.0-beta.25`. That means its API might change without warning between updates. When something breaks after an update, check the changelog first.

---

## Mini Exercises

### Exercise 1: Add a Script
Add a new script called `"db:reset"` that runs the migrate command followed by the seed command. (Hint: you can chain shell commands with `&&`.)

<details>
<summary>Solution</summary>

```json
"db:reset": "drizzle-kit migrate && tsx src/lib/db/seed.ts"
```

Add this inside the `"scripts"` block. Now `npm run db:reset` will migrate the database and then seed it with test data in one command.
</details>

### Exercise 2: Spot the Odd One Out
`@faker-js/faker` is in `dependencies` but only used in the seed script. Move it to `devDependencies` and verify the seed script still works.

<details>
<summary>Solution</summary>

```bash
npm uninstall @faker-js/faker
npm install --save-dev @faker-js/faker
```

Then run `npm run seed` to verify nothing broke. This works because `tsx` can resolve packages from `devDependencies` just fine in a local development environment.
</details>

### Exercise 3: Read the Lock File
Open `package-lock.json` and find the actual installed version of `zod`. Is it exactly `4.1.11`, or did `^` allow a newer patch version?

<details>
<summary>Hint</summary>

Search for `"zod"` in `package-lock.json` and look at the `"version"` field. The lock file records the *exact* version that was installed, regardless of what range `package.json` specifies.
</details>

---

## Further Reading

- [npm docs: package.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-json) -- The official reference. Dry but comprehensive.
- [Semver explained](https://semver.org/) -- The specification behind version numbers.
- [npm scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts) -- How scripts work, including lifecycle hooks like `preinstall` and `postinstall`.
- [Understanding package-lock.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json) -- Why the lock file exists and why you should commit it.
- [Differences between dependencies, devDependencies, and peerDependencies](https://nodejs.org/en/learn/getting-started/an-introduction-to-the-npm-package-manager) -- When each one matters.
