# Guide: Auth Route (NextAuth Catch-All)

**File covered:** `src/app/api/auth/[...nextauth]/route.ts`

---

## Purpose

This two-line file is the glue between **NextAuth.js** (the authentication library) and **Next.js App Router** (the framework's routing system). It exists so that every URL under `/api/auth/*` -- sign-in, sign-out, callback, session, etc. -- gets handled by NextAuth automatically. You do not write the logic for those endpoints yourself; NextAuth ships them, and this file just wires them up.

If you deleted this file, clicking "Sign In" in the app would return a 404.

---

## Line-by-line walkthrough

```typescript
import { handlers } from "@/auth";
```

This imports an object called `handlers` from the project's auth configuration file (likely `src/auth.ts` or `src/auth/index.ts`). That file is where you configure NextAuth -- which providers to use (GitHub, Google, credentials, etc.), what database adapter to use, what callbacks to run, and so on. The `handlers` object that NextAuth exports contains two pre-built request handlers: one for `GET` requests and one for `POST` requests.

The `@/` prefix is a **path alias** configured in `tsconfig.json`. It typically maps to `src/`, so `@/auth` means `src/auth`. This avoids messy relative imports like `../../../../auth`.

```typescript
export const { GET, POST } = handlers;
```

This line uses **destructuring** to pull `GET` and `POST` out of `handlers` and immediately **re-export** them as named exports from this file.

Why does this matter? In the Next.js App Router, a file named `route.ts` becomes an API endpoint, and the framework looks for exported functions whose names match HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. By exporting `GET` and `POST` here, you are telling Next.js: "when someone sends a GET or POST to this URL, hand it to NextAuth."

### What about the folder name `[...nextauth]`?

The square brackets with the three dots are Next.js **catch-all dynamic segment** syntax.

- `[id]` would match a single segment, like `/api/auth/signin`.
- `[...nextauth]` matches **one or more** segments, like `/api/auth/signin`, `/api/auth/callback/github`, `/api/auth/session`, and so on.

The name `nextauth` inside the brackets is arbitrary -- it could be `[...anything]`. But the convention is `nextauth` so other developers instantly recognize what this route does.

---

## Concepts taught

| Concept | What you just saw |
|---|---|
| **Catch-all routes** | `[...param]` in a folder name matches any number of URL segments. |
| **Named exports for HTTP methods** | Next.js App Router maps exported function names (`GET`, `POST`, etc.) to HTTP methods. |
| **Destructured re-export** | `export const { GET, POST } = handlers;` pulls values out and exports them in one step. |
| **Path aliases** | `@/auth` is a shortcut for `src/auth`, configured in `tsconfig.json`. |
| **Delegation pattern** | This file does not contain any logic. It delegates everything to the auth library. Two lines, zero business logic. |

---

## Common mistakes

1. **Putting auth configuration in this file.** The route file should stay tiny. All provider setup, callbacks, and adapter config belong in `src/auth.ts` (or wherever `@/auth` points). If you start adding logic here, the file becomes hard to maintain and you lose the clean separation.

2. **Renaming the folder and breaking NextAuth.** NextAuth expects its endpoints to live under `/api/auth/`. If you rename the folder to something like `[...authentication]` but keep it under `/api/auth/`, that works fine (the param name does not matter). But if you move the folder to `/api/login/[...nextauth]/`, NextAuth will not find its own callback URLs unless you also update the `NEXTAUTH_URL` and related configuration.

3. **Forgetting to export both GET and POST.** NextAuth needs both. Sign-in pages use GET. Form submissions (like the credentials provider) use POST. CSRF token checks use POST. If you only export GET, half of the auth flow breaks silently.

4. **Confusing `[...nextauth]` with `[[...nextauth]]`.** Double brackets (`[[...param]]`) create an **optional** catch-all that also matches the bare path (e.g., `/api/auth` with no trailing segment). Single brackets require at least one segment. For NextAuth, you want the single-bracket version because you always need a sub-path like `/signin` or `/callback/github`.

---

## Mini exercises

### Exercise 1 -- Trace the delegation

Open `src/auth.ts` (or wherever `@/auth` resolves to). Find where `handlers` is created. What function or method produces it? What configuration options are passed to that function?

Write down the chain: `route.ts` imports `handlers` from `___`, which calls `___()` with `___` as config.

<details>
<summary>Hint</summary>

Look for something like `NextAuth(authConfig)` or `NextAuth({ providers: [...], ... })`. The return value of that function typically includes `handlers`, `auth`, `signIn`, and `signOut`.

</details>

### Exercise 2 -- What routes does NextAuth register?

Without looking at NextAuth docs, try visiting these URLs in your browser while the dev server is running (or use `curl`):

- `/api/auth/providers`
- `/api/auth/session`
- `/api/auth/csrf`
- `/api/auth/signin`

What does each one return? Which ones return JSON and which return HTML?

<details>
<summary>Answer</summary>

- `/providers` returns JSON listing all configured providers.
- `/session` returns JSON with the current session (or an empty object if not logged in).
- `/csrf` returns a JSON object with a CSRF token.
- `/signin` returns an HTML page (the default sign-in UI) unless you have configured a custom sign-in page.

</details>

### Exercise 3 -- Add a third method

What happens if you add `PUT` to the destructured export?

```typescript
export const { GET, POST, PUT } = handlers;
```

Will the app crash? Will it silently fail? Try it and check the TypeScript error (if any).

<details>
<summary>Answer</summary>

TypeScript will give you an error because `handlers` only contains `GET` and `POST`. There is no `PUT` property on the object, so destructuring it yields `undefined`, and exporting `undefined` as a route handler would cause a runtime error when someone sends a PUT request. The TypeScript error catches this before you ever run the code.

</details>

---

## Further reading

- **NextAuth.js v5 documentation:** https://authjs.dev/getting-started
- **Next.js App Router -- Route Handlers:** https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Next.js dynamic routes (catch-all segments):** https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes#catch-all-segments
- **TypeScript destructuring:** https://www.typescriptlang.org/docs/handbook/variable-declarations.html#destructuring
