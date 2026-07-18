# Guide: Auth Middleware (`src/lib/auth/middleware.ts`)

## Purpose

This file provides a **server-side permission gate**. It exports a single function, `requirePermission`, that any server component or API route can call to answer the question: "Does the currently logged-in user have permission to do this specific thing?"

It ties together two systems: the auth system (to find out who is making the request) and the RBAC system (to check what that person is allowed to do). It is the enforcement layer -- the place where the rules defined in `rbac.ts` actually get applied to real requests.

This is a short file (about 10 lines), but it demonstrates an important architectural concept: **keeping authorization checks in a reusable function instead of scattering if-statements throughout your codebase**. When every API route calls `requirePermission("operations.execute")` instead of manually checking roles, you get consistent behavior and a single place to update if the logic changes.

---

## Line-by-Line Walkthrough

```typescript
import { auth } from "@/auth";
```

Imports the `auth` function from the root-level auth entry point. Remember from the `auth.ts` guide: this is the configured NextAuth session retrieval function. Calling `await auth()` returns the current session (with `user.id`, `user.role`, `user.department`) or `null` if no one is logged in.

```typescript
import { hasPermission, type PermissionKey, type Role } from "@/lib/auth/rbac";
```

Imports three things from the RBAC module:
- `hasPermission` -- the runtime function that checks the permission matrix.
- `PermissionKey` -- the type of valid permission strings (imported as `type` since it is only used for type annotations).
- `Role` -- the type of valid role strings (also type-only).

This import line is a good example of a file that bridges two modules. It does not implement any auth or RBAC logic itself -- it just wires them together.

```typescript
export async function requirePermission(permission: PermissionKey) {
```

The function signature tells you a lot:

- **`export`** -- Other files will call this function. It is the public API of this module.
- **`async`** -- It is asynchronous because `auth()` needs to read the session from the request cookie, which is an async operation in Next.js.
- **`permission: PermissionKey`** -- The parameter is typed as `PermissionKey`, not `string`. This means TypeScript will catch typos at compile time. If you write `requirePermission("operatons.execute")` (note the typo), TypeScript will flag it immediately because `"operatons.execute"` is not a valid `PermissionKey`. This is the payoff of the `as const` pattern from the RBAC file flowing all the way through to the usage site.

```typescript
  const session = await auth();
```

Gets the current user's session. If the user is not logged in, `session` will be `null`. If they are logged in, `session.user` will contain `id`, `role`, `department`, and other fields set up by the callbacks in `config.ts`.

```typescript
  if (!session?.user?.role) {
    return { allowed: false, reason: "UNAUTHORIZED" } as const;
  }
```

The first check: is there a session, and does it have a user with a role? If not, the request is **unauthorized** (HTTP 401 territory). This means no one is logged in, or the session is corrupted/incomplete.

The `?.` optional chaining is doing defensive work here. `session` could be `null`, `session.user` could be `undefined`, and `user.role` could be missing. The chain of `?.` handles all of these cases without nested `if` statements.

The return value is an object with `allowed: false` and `reason: "UNAUTHORIZED"`. The `as const` assertion narrows the types so TypeScript knows that `allowed` is literally `false` (not just `boolean`) and `reason` is literally `"UNAUTHORIZED"` (not just `string`). This will matter to the caller -- more on that below.

```typescript
  const allowed = hasPermission(session.user.role as Role, permission);
```

The second check: we know a user is logged in and has a role, so now we check if that role has the requested permission. The `session.user.role` value is stored as `string` in the session (because that is how the session callback typed it), so it needs to be cast to `Role` to satisfy `hasPermission`'s parameter type.

This cast (`as Role`) is a known trade-off. In a more strictly typed system, you might validate that the string is actually a valid `Role` at runtime before calling `hasPermission`. But since the role was set by our own `authorize` function from a typed operator record, it is safe to assume it is valid. The RBAC file's defensive `?.` and `?? false` in `hasPermission` provide a safety net even if it is not.

```typescript
  return { allowed, reason: allowed ? null : "FORBIDDEN", session } as const;
```

The return value contains three things:
- **`allowed`** -- `true` or `false`.
- **`reason`** -- `null` if allowed, `"FORBIDDEN"` if not (HTTP 403 territory). The distinction between `"UNAUTHORIZED"` (no identity) and `"FORBIDDEN"` (identified but not permitted) matches HTTP semantics. This is a professional habit worth building.
- **`session`** -- The full session object is included so the caller does not have to make a second `auth()` call. This is a small efficiency: you already fetched the session, so pass it along.

The `as const` assertion is crucial for the return type. Without it, TypeScript would infer `reason` as `string | null`. With it, TypeScript infers the exact literal types: either `{ allowed: true, reason: null, session: Session }` or `{ allowed: false, reason: "FORBIDDEN", session: Session }`. Combined with the early return for `"UNAUTHORIZED"`, the full return type is a **discriminated union** -- the caller can check `allowed` and TypeScript will narrow the other fields automatically.

```typescript
}
```

That is the entire function. Twelve lines, and it handles: unauthenticated users, unauthorized users, and authorized users, with type-safe return values and proper HTTP semantics.

---

## Concepts Taught

### Discriminated unions with `as const`
The return type of this function is a union of three possible shapes, discriminated by the `allowed` and `reason` fields. When the caller writes `if (!result.allowed)`, TypeScript knows that `result.reason` is either `"UNAUTHORIZED"` or `"FORBIDDEN"`, not `null`. This is called **type narrowing** and it is one of TypeScript's most powerful features for writing safe code.

### The UNAUTHORIZED vs FORBIDDEN distinction
These map to HTTP status codes 401 and 403:
- **401 Unauthorized** (really means "unauthenticated"): "I don't know who you are. Please log in."
- **403 Forbidden**: "I know who you are, but you're not allowed to do this."

This distinction matters for UX (showing a login form vs an "access denied" page) and for API design (returning the correct status code).

### Reusable authorization middleware
Instead of every API route reimplementing permission checks, they all call `requirePermission`. This means:
- Consistent behavior across the entire application.
- One place to add logging, rate limiting, or audit trails later.
- Easy to test in isolation.

### Returning the session as a bonus
A common pattern in middleware functions: return extra data that the caller is likely to need. Since `requirePermission` already fetched the session, it includes it in the return value. The alternative would be the caller calling `auth()` again, which is wasteful.

### The `as Role` cast pattern
When data crosses a boundary (like being stored in a JWT token and read back as `string`), you sometimes lose type precision. The `as Role` cast restores it. This is a pragmatic compromise. The ideal solution would be a runtime validation step (like a Zod parse), but the cast is acceptable when you control the data pipeline end-to-end.

---

## Common Mistakes

1. **Forgetting to `await` the function.** `requirePermission` is async, so you must write `const result = await requirePermission("operations.execute")`. If you forget `await`, `result` will be a `Promise` object, and `result.allowed` will be `undefined` (which is falsy, so it might accidentally work for denial but will break for approval). This is a sneaky bug.

2. **Checking only `allowed` without handling `reason`.** If `allowed` is `false`, you need to know why. An unauthorized user should be redirected to the login page. A forbidden user should see an "access denied" message. Treating both the same way leads to a confusing user experience.

3. **Hardcoding roles instead of using this function.** It is tempting to write `if (session.user.role === "super_admin")` in an API route. Resist this. It creates a maintenance nightmare when permissions change. Always check permissions, not roles.

4. **Calling `requirePermission` on the client.** This function uses `auth()`, which only works on the server (it reads cookies from the incoming request). If you try to call it in a client component, it will crash. For client-side permission checks, you need to read the session with NextAuth's `useSession` hook and call `hasPermission` directly.

---

## Mini Exercises

### Exercise 1: Use it in an API route
Write a Next.js API route (or Server Action) that calls `requirePermission("billing.manage")`. If `allowed` is `false`, return an appropriate response based on the `reason`. If `allowed` is `true`, use `session.user` to log who accessed the endpoint. This exercise connects the middleware to real application code.

### Exercise 2: Add audit logging
Modify `requirePermission` to log every permission check (both allowed and denied) to the console. Include the user's email, the permission requested, and the result. This is a stepping stone toward a real audit trail. Think about what information you would want in a production audit log.

### Exercise 3: Create a `requireAnyPermission` variant
Write a new function called `requireAnyPermission(permissions: PermissionKey[])` that checks if the user has **at least one** of the listed permissions. This is useful for pages that should be accessible to multiple roles (like a dashboard visible to anyone with `dashboard.read` OR `audit.read`). Reuse the existing `requirePermission` logic as much as possible.

---

## Further Reading

- **HTTP 401 vs 403**: A deeper explanation of the authentication vs authorization distinction and when each status code is appropriate.
- **TypeScript discriminated unions**: The TypeScript Handbook section on narrowing explains how literal types in unions enable type-safe branching.
- **Next.js Server Components and async**: How `async` functions work in the Next.js App Router, and why `auth()` must be awaited.
- **The middleware pattern**: How middleware functions compose in frameworks like Express.js and Next.js. The concept of "check something, then either proceed or abort" is universal.
- **Defense in depth**: Why you should check permissions at both the UI level (hiding buttons) and the server level (this function). Never trust the client alone.
