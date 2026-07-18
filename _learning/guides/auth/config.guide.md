# Guide: Auth Configuration (`src/lib/auth/config.ts`)

## Purpose

This file is the **central configuration for NextAuth.js**, the authentication library used by this Next.js project. It defines how users log in (credentials-based), how their sessions are stored (JWT tokens), and how user data flows from the login step through to the session object that the rest of the application uses.

If the RBAC file answers "what can this role do?", this file answers "how does someone prove who they are, and how does the application remember that?" It is the glue between the operator data, the permission system, and the Next.js framework.

This is also the file where you will see several real-world patterns: input validation with Zod, the NextAuth callback chain, and the `satisfies` keyword. It is a dense file, so we will take it slowly.

---

## Line-by-Line Walkthrough

```typescript
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { DEFAULT_OPERATOR_PASSWORD, operators } from "@/lib/auth/operators";
```

Four imports, each with a different purpose:

- `NextAuthConfig` is a type (note the `import type`) that describes the shape of the configuration object. It exists only for TypeScript validation.
- `Credentials` is a NextAuth **provider**. NextAuth supports many providers (Google, GitHub, email magic links, etc.). This project uses the Credentials provider, which means users type in an email and password, and your code decides whether to accept them.
- `z` is the Zod library, which is used for runtime validation. TypeScript checks types at compile time; Zod checks data shapes at runtime. You need both because data coming from a user's browser is just raw `unknown` -- TypeScript cannot guarantee its shape.
- `DEFAULT_OPERATOR_PASSWORD` and `operators` are the hardcoded user data from the operators file.

```typescript
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

This is a **Zod schema**. It describes what valid login credentials look like at runtime:

- `email` must be a string that looks like an email address (Zod checks the format).
- `password` must be a string with at least 8 characters.

Why not just check these with `if` statements? You could, but Zod gives you several advantages: the validation rules are declarative (easy to read), you get the validated and typed data back automatically, and the error messages are structured and consistent. In larger applications, Zod schemas are also reusable -- the same schema can validate form input on the client and API input on the server.

Notice this is `const`, not `export const`. It is a private implementation detail of this file.

```typescript
export const authConfig = {
```

The main configuration object. Everything that follows configures how NextAuth behaves.

```typescript
  pages: { signIn: "/login" },
```

This tells NextAuth to use a custom login page at `/login` instead of its default built-in page. Without this, NextAuth would show its own generic sign-in UI. Most production apps want a custom login page that matches their design.

```typescript
  session: { strategy: "jwt" },
```

This chooses **JWT (JSON Web Token)** as the session strategy. The alternative is `"database"`, where sessions are stored in a database. With JWT, the session data is encoded into a token stored in the user's browser cookie. The tradeoff: JWT sessions are stateless (no database lookups needed to validate them) but they cannot be easily revoked server-side. For an internal tool like this, JWT is the simpler choice.

```typescript
  providers: [
    Credentials({
```

The `providers` array lists all the ways a user can authenticate. This project has only one: the Credentials provider.

```typescript
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
```

This describes the form fields that the Credentials provider expects. The `label` and `type` values are used if you rely on NextAuth's auto-generated sign-in page. Since this project uses a custom login page, these are mostly for documentation purposes, but they are still good practice to include.

```typescript
      authorize: async (rawCredentials) => {
```

This is the **authorize function** -- the heart of the login process. NextAuth calls it whenever someone submits the login form. It receives the raw form data (which is typed as `unknown` or a partial record, depending on the NextAuth version) and must return either a user object (login succeeds) or `null` (login fails).

The `async` keyword is here because in a real application, this function would likely query a database, which is an asynchronous operation. In this project, it does not actually need to be async since everything is synchronous, but keeping it async matches the NextAuth interface and prepares the function for a future database migration.

```typescript
        const parseResult = credentialsSchema.safeParse(rawCredentials);
        if (!parseResult.success) return null;
        const { email, password } = parseResult.data;
```

Three lines that demonstrate a critical pattern: **validate before you use**.

`safeParse` runs the Zod schema against the raw input. Unlike `parse` (which throws an error on invalid input), `safeParse` returns a result object with either `{ success: true, data: ... }` or `{ success: false, error: ... }`. This lets you handle invalid input gracefully instead of crashing.

If validation fails, we return `null` immediately. No error message is sent to the user about what specifically was wrong -- this is intentional for security. You do not want to tell an attacker "the email format was invalid" versus "the password was too short." A generic "login failed" is safer.

If validation succeeds, we destructure `email` and `password` from `parseResult.data`. At this point, TypeScript knows both are valid strings because Zod verified them.

```typescript
        const operator = operators.find((item) => item.email.toLowerCase() === email.toLowerCase());
```

Looks up the operator by email. The `.toLowerCase()` on both sides makes the comparison case-insensitive, so `Alex@Novacom.Internal` matches `alex@novacom.internal`. This is important because email addresses are case-insensitive by convention (per the RFC), and users often capitalize the first letter on mobile keyboards.

```typescript
        if (!operator || password !== DEFAULT_OPERATOR_PASSWORD) return null;
```

Two checks combined: does the operator exist, and does the password match? If either fails, return `null` (login denied). Notice that the order matters for a subtle reason: if `operator` is `null`, JavaScript short-circuits and never evaluates the password check. This prevents potential errors from accessing properties on `null`.

**Honest assessment:** Comparing passwords with `!==` is a plain string comparison. In production, you would use `bcrypt.compare()` or similar, which compares against a hashed password and is timing-safe (resistant to timing attacks). This code is fine for a demo but would be a security vulnerability in production.

```typescript
        return {
          id: operator.id, name: operator.name, email: operator.email,
          role: operator.role, department: operator.department,
        };
```

Login succeeded. We return a user object containing the fields NextAuth needs (`id`, `name`, `email`) plus our custom fields (`role`, `department`). NextAuth will pass this object to the `jwt` callback next.

```typescript
      },
    }),
  ],
```

End of the Credentials provider configuration.

```typescript
  callbacks: {
```

NextAuth **callbacks** are functions that run at specific points in the auth lifecycle. They let you customize what data gets stored in the JWT token and what data gets exposed in the session object. This is where most of the "magic" (and confusion) in NextAuth happens.

```typescript
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.department = (user as { department?: string }).department;
      }
      return token;
    },
```

The **JWT callback** runs every time a JWT token is created or updated. The key thing to understand: the `user` parameter is **only present on the initial sign-in**. On subsequent requests, `user` is `undefined` and you only have `token`. This is why the `if (user)` check exists -- we only need to copy the custom fields into the token once, when the user first logs in.

The type casts (`user as { role?: string }`) are needed because NextAuth's default `User` type does not include `role` or `department`. This project also has a type declaration file (`next-auth.d.ts`) that extends the types, but the cast here is an extra safety measure. It is a bit ugly, and you will see this kind of pragmatic casting in real codebases when library types do not quite match your needs.

```typescript
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as string;
        session.user.department = token.department as string;
      }
      return session;
    },
```

The **session callback** runs whenever the session is read (which happens on most page loads and API calls). It takes the JWT token and transforms it into the session object that your application code actually uses.

`token.sub` is a standard JWT field meaning "subject" -- it holds the user's ID. The `?? ""` provides a fallback empty string if `sub` is somehow missing.

`token.role` and `token.department` were set in the JWT callback above. We cast them to `string` because the token stores them as `unknown` by default.

The result: when any part of the application calls `auth()` to get the session, the returned `session.user` object will have `id`, `role`, and `department` fields ready to use.

```typescript
  },
} satisfies NextAuthConfig;
```

The `satisfies` keyword is a TypeScript feature that checks whether a value matches a type **without widening the type**. Compare:

- `const config: NextAuthConfig = { ... }` -- TypeScript treats `config` as type `NextAuthConfig`, losing any specific information about your actual values.
- `const config = { ... } satisfies NextAuthConfig` -- TypeScript validates that your object matches `NextAuthConfig` but keeps the narrower inferred type. This means you get type checking AND autocomplete on the specific values you defined.

In practice, `satisfies` catches typos (like writing `providers` as `prviders`) while still letting TypeScript know the exact shape of your object.

---

## Concepts Taught

### Runtime validation with Zod
TypeScript types disappear at runtime. Data from external sources (forms, APIs, databases) needs runtime validation. Zod lets you define a schema once and get both runtime validation and TypeScript type inference from it. The `safeParse` method is preferred over `parse` because it does not throw exceptions.

### The NextAuth callback chain
Data flows through NextAuth in a specific order: `authorize` -> `jwt` callback -> `session` callback. Understanding this pipeline is essential for debugging "my session doesn't have the right data" issues. The `user` object from `authorize` is only available in the first `jwt` callback invocation; after that, you must read from the token.

### The `satisfies` keyword
`satisfies` is TypeScript's way of saying "check this value against this type, but keep the specific inferred type." It is newer (TypeScript 4.9+) and extremely useful for configuration objects where you want both validation and precise type inference.

### Defensive returns in authorize
Returning `null` for any kind of failure (bad format, wrong email, wrong password) is intentional. Never return different error types or messages that would let an attacker distinguish between "user not found" and "wrong password."

### Case-insensitive email comparison
Emails are case-insensitive by convention. Always normalize (`.toLowerCase()`) before comparing. This is easy to forget and leads to "I can't log in" bug reports.

---

## Common Mistakes

1. **Forgetting that `user` is only available on initial sign-in.** In the `jwt` callback, `user` is `undefined` on subsequent token refreshes. If you try to access `user.role` without the `if (user)` check, your app will crash on every request after the first.

2. **Confusing `parse` and `safeParse`.** Using `parse` means invalid input throws an exception, which you would need to catch. Using `safeParse` returns a result object. For user-facing input, `safeParse` is almost always what you want.

3. **Not understanding the callback order.** If you try to access `session.user.role` but forgot to set `token.role` in the `jwt` callback, the session callback will not have the data. The data must flow: authorize -> jwt -> session. Each step only has access to what the previous step provided.

4. **Using `as` casts without thinking.** The `(user as { role?: string }).role` pattern works, but it also silences TypeScript. If you cast incorrectly, TypeScript will not warn you. Prefer proper type declarations (see the `next-auth.d.ts` guide) over casts when possible.

---

## Mini Exercises

### Exercise 1: Add a validation rule
Add a check to `credentialsSchema` requiring that the email ends with `@novacom.internal`. Use Zod's `.refine()` method. Test it by trying to log in with a `@gmail.com` address.

### Exercise 2: Trace the data flow
Starting from the `authorize` function, write down on paper every place the `role` value appears as it flows through the system. Where is it first set? Where is it copied to the token? Where is it copied to the session? This exercise builds your mental model of how data flows through callback chains.

### Exercise 3: Add a `lastLogin` timestamp
Add a `lastLogin` field that records the current time (`new Date().toISOString()`) when the user logs in. You will need to: (a) return it from `authorize`, (b) copy it to the token in the `jwt` callback, (c) expose it on the session in the `session` callback. This exercise forces you to work through the full callback pipeline.

---

## Further Reading

- **NextAuth.js documentation**: The official docs on Credentials provider, callbacks, and session strategies.
- **Zod documentation**: Especially `safeParse`, `refine`, and how to infer TypeScript types from schemas with `z.infer<typeof schema>`.
- **JSON Web Tokens explained**: How JWTs are structured (header, payload, signature), what `sub` means, and why they are base64-encoded but not encrypted.
- **TypeScript `satisfies` operator**: The TypeScript 4.9 release notes explain the motivation and behavior.
- **OAuth vs Credentials auth**: Why many projects prefer OAuth providers (Google, GitHub) over username/password, and when Credentials-based auth is the right choice.
