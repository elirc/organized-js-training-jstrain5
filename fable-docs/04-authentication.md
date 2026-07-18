# Chapter 4 — Authentication & Permissions: Who Are You, and What May You Do?

> **Mental model:** authentication and authorization are two different questions asked at two
> different times. *Authentication* ("who are you?") happens once, at login, and its answer is
> carried in a signed token. *Authorization* ("may you do this?") happens on every sensitive
> action, by looking up the role from that token in a permission table. Seven files split this
> work, and each has exactly one job.

Juniors mix these words up constantly, so anchor them now: **authentication = identity,
authorization = permission**. You can be authenticated (logged in as Riley from Support) and
still not authorized (Riley can't manage billing).

## The cast of seven files

| File | One job |
|---|---|
| [`src/lib/auth/operators.ts`](../src/lib/auth/operators.ts) | WHO exists (hardcoded demo users) |
| [`src/lib/auth/rbac.ts`](../src/lib/auth/rbac.ts) | WHAT each role may do |
| [`src/lib/auth/config.ts`](../src/lib/auth/config.ts) | HOW login works and what the session carries |
| [`auth.ts`](../auth.ts) (repo root) | Activates the config; exports `auth()`, `signIn`, `signOut` |
| [`middleware.ts`](../middleware.ts) (repo root) | Enforces "logged in?" on every request |
| [`src/lib/auth/middleware.ts`](../src/lib/auth/middleware.ts) | Enforces "permitted?" wherever asked |
| [`src/types/next-auth.d.ts`](../src/types/next-auth.d.ts) | Teaches TypeScript about our custom session fields |

Why so many small files instead of one `auth.ts` mega-module? Because each piece changes for
a different reason: the user list will move to the database, the permission map changes when
product adds features, the NextAuth config changes when the login method changes. Files that
change for different reasons should be different files — that's the practical meaning of
"separation of concerns."

## The login flow, traced

**Stop 1 — the form.** [`src/app/(auth)/login/page.tsx`](../src/app/(auth)/login/page.tsx)
is a client component (`"use client"` — it needs `useState` and event handlers):

```typescript
const result = await signIn("credentials", {
  email,
  password,
  redirect: false,        // ← we handle navigation ourselves…
  callbackUrl: "/dashboard",
});

if (result?.error) {
  setError("Invalid credentials.");   // ← …so we can show an inline error
  return;
}
window.location.href = result?.url ?? "/dashboard";
```

`redirect: false` is the line to understand: with the default (`true`), NextAuth would
navigate away on failure too, and the user would land on an ugly error page. Handling the
result manually is what makes the "Invalid credentials." message appear *in the form*.
Notice also the component tracks `isSubmitting` to disable the button — double-submitting a
login form is a real-world bug, not a hypothetical.

**Stop 2 — validation and identity check.**
[`src/lib/auth/config.ts`](../src/lib/auth/config.ts) receives the credentials:

```typescript
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authorize: async (rawCredentials) => {
  const parseResult = credentialsSchema.safeParse(rawCredentials);  // ① validate shape
  if (!parseResult.success) return null;

  const { email, password } = parseResult.data;
  const operator = operators.find(
    (item) => item.email.toLowerCase() === email.toLowerCase(),     // ② find user
  );

  if (!operator || password !== DEFAULT_OPERATOR_PASSWORD) return null;  // ③ check secret

  return { id: operator.id, name: operator.name, email: operator.email,
           role: operator.role, department: operator.department };  // ④ identity payload
},
```

Three teachable moments:

- ① **Zod before logic.** Even the *login form's* input is untrusted. Validating shape
  first means step ② never sees garbage. You'll meet this same validate-at-the-boundary
  pattern in [Chapter 5](05-api-layer.md) — it's the repo's most consistent habit.
- ② **`.toLowerCase()` on both sides** — emails are case-insensitive in real life;
  forgetting this produces the maddening "my password is right but login fails" support
  ticket (user signed up as `Alex@…`, logs in as `alex@…`).
- ③ **Returning `null` for *both* "no such user" and "wrong password"** is deliberate: a
  different error for each would tell an attacker which emails exist (this is called
  *user enumeration*).

**The honest caveat:** `password !== DEFAULT_OPERATOR_PASSWORD` compares a plaintext
constant from [`src/lib/auth/operators.ts`](../src/lib/auth/operators.ts)
(`"password123"`). This is demo scaffolding. Production systems store only a *hash* (bcrypt
or argon2) and compare with `bcrypt.compare(input, storedHash)` — so that even a stolen
database doesn't yield passwords. Being able to say *which* shortcuts in a codebase are
acceptable scaffolding and which would be negligence in production is a skill interviewers
probe directly.

**Stop 3 — the session gets minted.** With identity confirmed, NextAuth creates a **JWT**
(JSON Web Token): a signed string stored in a cookie, containing the user data. "Signed"
means the server used `NEXTAUTH_SECRET` to fingerprint the contents — a tampered token fails
verification. But by default the JWT only carries name/email. Our RBAC needs `role`, so the
config's callbacks thread it through:

```typescript
callbacks: {
  jwt: async ({ token, user }) => {          // runs when the token is created/updated
    if (user) {                              // `user` exists only at login time
      token.role = (user as { role?: string }).role;
      token.department = (user as { department?: string }).department;
    }
    return token;
  },
  session: async ({ session, token }) => {   // runs whenever the app reads the session
    if (session.user) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role as string;
      session.user.department = token.department as string;
    }
    return session;
  },
},
```

The data path to memorize: **`authorize` return → `jwt` callback → token (cookie) →
`session` callback → `session.user` everywhere**. When "the role is missing from my
session" happens at a real job — and it will — the break is in one of these two callbacks.

(The `(user as { role?: string })` casts are a known wart: NextAuth's `User` type doesn't
know about `role`. The `as` keyword tells TypeScript "trust me." It works, but a type guard
would be safer — `as` silences the compiler rather than convincing it.)

**Stop 4 — TypeScript catches up.**
[`src/types/next-auth.d.ts`](../src/types/next-auth.d.ts) uses *module augmentation* to add
`role`, `department`, and `id` to NextAuth's `Session`, `User`, and `JWT` interfaces.
No runtime code — it exists so `session.user.role` autocompletes and `session.user.rolee`
is a compile error. Without this file, every session access would need a cast.

**Stop 5 — activation.** [`auth.ts`](../auth.ts) at the repo root is four lines:

```typescript
export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
```

Config is data; this file turns it on. Everything else in the app imports from `@/auth`.
And [`src/app/api/auth/[...nextauth]/route.ts`](../src/app/api/auth/[...nextauth]/route.ts)
re-exports `handlers` so every URL under `/api/auth/*` (sign-in, sign-out, session,
callbacks) is served by NextAuth automatically — a *catch-all route* (`[...nextauth]`
matches any depth of path).

## Authorization: RBAC in one readable file

[`src/lib/auth/rbac.ts`](../src/lib/auth/rbac.ts) is the whole permission system:

```typescript
export const permissionKeys = [
  "dashboard.read", "customers.read", "customers.write",
  "operations.execute", "operations.approve", "incidents.manage",
  "billing.manage", "feature_flags.manage", "settings.manage", "audit.read",
] as const;

export type PermissionKey = (typeof permissionKeys)[number];   // ← type derived FROM data

const rolePermissions: Record<Role, PermissionKey[]> = {
  super_admin: [...permissionKeys],          // everything
  ops_lead:    [/* execute AND approve */ "operations.execute", "operations.approve", /* … */],
  ops_engineer:[/* execute but NOT approve */ "operations.execute", /* … */],
  support:     ["dashboard.read", "customers.read", "customers.write", "incidents.manage", "audit.read"],
  finance:     ["dashboard.read", "customers.read", "billing.manage", "audit.read"],
  viewer:      ["dashboard.read", "customers.read"],
};

export function hasPermission(role: Role, permission: PermissionKey) {
  return rolePermissions[role]?.includes(permission) ?? false;
}
```

Three things to absorb:

- **The problem RBAC solves:** without it, permission checks look like
  `if (user.role === "admin" || user.role === "ops_lead" || …)` scattered across fifty
  files. Product says "support should also manage incidents" and you're grepping the
  codebase praying you found every check. With RBAC, that change is *one line in one file*.
- **`(typeof permissionKeys)[number]`** derives the `PermissionKey` type from the array
  itself. Add `"reports.read"` to the array and the type updates automatically — the list
  and the type can never disagree. Deriving types from data instead of maintaining both is
  a habit that eliminates a whole class of drift bugs.
- **`?? false` — deny by default.** An unknown role gets *nothing*, not everything. Security
  defaults should always fail closed.
- **Read the business logic in the data:** `ops_engineer` can `operations.execute` but not
  `operations.approve`; `ops_lead` can do both. That's separation of duties — the person
  who fires a dangerous operation shouldn't be the only one who can bless it. Permission
  maps are policy documents; learn to read them as such.

**Enforcement** is [`src/lib/auth/middleware.ts`](../src/lib/auth/middleware.ts) — one
reusable gate that ties identity to permission:

```typescript
export async function requirePermission(permission: PermissionKey) {
  const session = await auth();
  if (!session?.user?.role) {
    return { allowed: false, reason: "UNAUTHORIZED" } as const;   // not logged in (401)
  }
  const allowed = hasPermission(session.user.role as Role, permission);
  return { allowed, reason: allowed ? null : "FORBIDDEN", session } as const;  // logged in but not permitted (403)
}
```

Note the two distinct failure reasons — they map to HTTP 401 vs 403, and to two different
user experiences ("please log in" vs "ask your manager for access"). And note the guard-
clause style: check the failure case first, return early, keep the happy path unindented.
You saw this in the flag evaluator preview; you'll see it everywhere in this repo.

Finally, [`middleware.ts`](../middleware.ts) at the root (traced in
[Chapter 1](01-big-picture.md)) enforces the *authentication* half globally — no session,
no protected page. Route-level `requirePermission` calls enforce the *authorization* half
per action.

## Common junior mistakes

- **Confusing 401 with 403.** 401 = not authenticated ("who are you?"), 403 = authenticated
  but not allowed ("you may not"). Returning the wrong one sends users (and your own
  debugging) down the wrong path.
- **Checking permissions only in the UI.** Hiding the "Delete" button is UX, not security —
  anyone can call the API directly with `fetch`. Every mutation needs a server-side
  `requirePermission` check. The symptom of getting this wrong is a security incident, not
  a bug ticket.
- **Putting more data in the JWT because it's convenient.** The token is sent with *every
  request* and can't be shrunk without re-issuing. Store identity and role; look everything
  else up server-side.
- **Adding a role by copy-pasting the closest existing role.** The copied list quietly
  includes a permission the new role shouldn't have. Fix: write the new role's list from
  the *product requirement*, not from a neighbor.
- **"It works when I comment out the auth check."** Yes, and the bank vault works great
  with the door open. If an auth check blocks legitimate work, the fix is in the permission
  map, never in deleting the check.

## Try it yourself

1. **Log in as two roles and diff the world.** `npm run dev`, log in as
   `alex@novacom.internal` (super_admin), note the header label. Log out, log in as
   `riley@novacom.internal` (support). Same password (`password123`). The label in
   [`src/components/app-header.tsx`](../src/components/app-header.tsx) comes from
   `session.user.role` — you're watching Stop 3's data path end to end.
2. **Break the JWT callback on purpose.** In
   [`src/lib/auth/config.ts`](../src/lib/auth/config.ts), comment out the
   `token.role = …` line, restart, log in again (the old cookie may persist — log out
   first). The header now shows `(undefined)`. You've just reproduced — and can now fix —
   the most common real-world session bug. Revert.
3. **Add an `auditor` role.** Requirements: may read the dashboard and audit logs, nothing
   else. Files you should end up touching: `rbac.ts` (the `Role` union + one map entry) and
   `operators.ts` (a test user). If you found yourself editing more files than that, the
   RBAC design would be failing — the whole point is that roles are one-file changes.
4. **Predict before opening.** Without looking, write down what
   [`src/app/api/auth/[...nextauth]/route.ts`](../src/app/api/auth/[...nextauth]/route.ts)
   contains, given what you know about `auth.ts`. Then open it. (It's two lines.)

## Ask your agent

> "Following this repo's RBAC pattern in src/lib/auth/rbac.ts, add a `billing_admin` role
> that has everything finance has plus operations.approve. Update the Role type, the
> permission map, and add a demo operator. Don't touch any other files."

Review the diff against exercise 3's checklist: exactly two files? Type and map both
updated? No permission smuggled in that the requirement didn't ask for? The constraint in
the prompt ("don't touch any other files") is deliberate — telling an agent the *boundary*
of a change is one of the highest-leverage prompting habits in
[Chapter 9](09-ai-assisted-engineering.md).

---

**You can now:** trace a login from form to session, add a role safely, explain
authentication vs. authorization (and 401 vs 403) precisely, and identify which parts of
this auth system are production-grade versus demo scaffolding.

**Next:** [Chapter 5 — The API Layer](05-api-layer.md): the envelope contract, and the one
route in this repo worth studying line by line.
