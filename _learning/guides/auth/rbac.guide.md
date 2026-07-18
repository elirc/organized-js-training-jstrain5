# Guide: Role-Based Access Control (`src/lib/auth/rbac.ts`)

## Purpose

This file implements **RBAC -- Role-Based Access Control**. It answers one question: "Given a user's role, are they allowed to do this specific thing?" Instead of scattering permission checks throughout the codebase (like `if (user.role === "admin" || user.role === "ops_lead")`), this file centralizes all the logic in one place. Every part of the application that needs to check a permission calls the `hasPermission` function defined here.

RBAC is one of the most common authorization patterns in production software. Understanding this file gives you a foundation that transfers directly to real-world projects.

---

## Line-by-Line Walkthrough

```typescript
export const permissionKeys = [
  "dashboard.read", "customers.read", "customers.write", "operations.execute",
  "operations.approve", "incidents.manage", "billing.manage", "feature_flags.manage",
  "settings.manage", "audit.read",
] as const;
```

This is the master list of every permission the application knows about. Each string follows a `resource.action` naming convention: `customers.read` means "read access to customers," `billing.manage` means "full management access to billing," and so on. This naming convention is not enforced by TypeScript -- it is a team convention that makes permissions self-documenting.

The `as const` at the end is the important part. Without it, TypeScript would infer the type as `string[]` -- just an array of any strings. With `as const`, TypeScript infers the type as a **readonly tuple of literal string types**. That means TypeScript knows the array contains exactly these 10 specific strings and nothing else. This is what makes the next line possible.

```typescript
export type PermissionKey = (typeof permissionKeys)[number];
```

This creates a **union type** from the array. Let's break down what is happening:

- `typeof permissionKeys` gives you the type of the array (a readonly tuple of those 10 specific strings).
- `[number]` indexes into that tuple with `number`, which means "give me the type of any element." Since every element is a specific string literal, you get a union of all of them.

The result is: `"dashboard.read" | "customers.read" | "customers.write" | "operations.execute" | "operations.approve" | "incidents.manage" | "billing.manage" | "feature_flags.manage" | "settings.manage" | "audit.read"`.

This is a powerful pattern. You define the permissions once as runtime data (the array), and TypeScript automatically derives the type from it. If you add a permission to the array, the type updates automatically. You never have to maintain the list in two places.

```typescript
export type Role = "super_admin" | "ops_lead" | "ops_engineer" | "support" | "finance" | "viewer";
```

A union type listing every role in the system. Unlike `PermissionKey`, this is defined directly as a type rather than derived from an array. That is a reasonable choice when the list is short and you do not need to iterate over all roles at runtime. If you later need an array of all roles (for example, to populate a dropdown), you would refactor this to use the `as const` pattern like `permissionKeys` does.

```typescript
const rolePermissions: Record<Role, PermissionKey[]> = {
```

This is the **permission matrix** -- the core of the RBAC system. It maps each role to an array of permissions that role is granted. The type `Record<Role, PermissionKey[]>` means "an object where every key is a `Role` and every value is an array of `PermissionKey`s." TypeScript will enforce two things:

1. Every role must be present as a key (you cannot forget to define permissions for `viewer`).
2. Every permission in the arrays must be a valid `PermissionKey` (you cannot accidentally type `"billing.reed"`).

Notice this is `const` (not `export const`). It is intentionally **not exported**. Outside code should not access the permission matrix directly -- they should use `hasPermission`. This is encapsulation: the matrix is an implementation detail that could change (maybe it comes from a database later), but the `hasPermission` interface stays the same.

```typescript
  super_admin: [...permissionKeys],
```

The super admin gets every permission. The spread operator `[...permissionKeys]` creates a copy of the full permissions array. This is cleaner and less error-prone than manually listing all 10 permissions. If you add a new permission to `permissionKeys`, super admin automatically gets it.

```typescript
  ops_lead: ["dashboard.read", "customers.read", "customers.write", "operations.execute", "operations.approve", "incidents.manage", "feature_flags.manage", "audit.read"],
  ops_engineer: ["dashboard.read", "customers.read", "customers.write", "operations.execute", "incidents.manage", "feature_flags.manage", "audit.read"],
```

The ops lead can do almost everything except billing, settings, and feature flags management... wait, actually they can manage feature flags. The ops engineer has the same set minus `operations.approve`. This reflects a real-world pattern: approving operations (like deploying to production) often requires a lead's sign-off.

```typescript
  support: ["dashboard.read", "customers.read", "customers.write", "incidents.manage", "audit.read"],
  finance: ["dashboard.read", "customers.read", "billing.manage", "audit.read"],
  viewer: ["dashboard.read", "customers.read"],
};
```

Support can manage customers and incidents but cannot execute operations. Finance can manage billing but nothing else operational. Viewers can only read. Each role is scoped to what that job function actually needs. This is the **principle of least privilege** in action: give each role only the permissions it requires and nothing more.

```typescript
export function hasPermission(role: Role, permission: PermissionKey) {
  return rolePermissions[role]?.includes(permission) ?? false;
}
```

This is the only exported function, and it is the public API of the RBAC system. It takes a role and a permission, looks up the role in the matrix, and checks whether the permission is in that role's list.

Let's look at the defensive coding here:

- `rolePermissions[role]?.includes(permission)` -- the `?.` (optional chaining) means "if `rolePermissions[role]` is `undefined`, don't crash, just return `undefined`." In theory this cannot happen because the `Record<Role, ...>` type guarantees every role is present. But types can be circumvented at runtime (for example, if someone casts a random string to `Role`), so this is a safety net.
- `?? false` -- the nullish coalescing operator. If the left side is `null` or `undefined`, return `false` instead. The default is denial: if anything unexpected happens, the answer is "no, you do not have permission." This is the correct security posture. You never want a permission check to accidentally return `true` (or a truthy value) due to an edge case.

---

## Concepts Taught

### `as const` assertions
Adding `as const` to a value tells TypeScript to infer the narrowest possible type. For arrays, this means inferring a readonly tuple of literal types instead of a mutable `string[]`. This is essential for deriving union types from runtime data.

### Deriving types from values (`typeof arr[number]`)
This pattern lets you define data once and derive types from it automatically. It is one of the most useful TypeScript tricks for keeping types and data in sync. You will see it in many production codebases.

### `Record<K, V>` utility type
`Record<Role, PermissionKey[]>` is a built-in TypeScript utility type that creates an object type where all keys are of type `K` and all values are of type `V`. It is more concise than writing out `{ super_admin: PermissionKey[]; ops_lead: PermissionKey[]; ... }` and it automatically updates when you add a new role.

### Optional chaining (`?.`) and nullish coalescing (`??`)
These two operators are your defensive coding toolkit. `?.` prevents "cannot read property of undefined" crashes. `??` provides a fallback when a value is `null` or `undefined`. Using them together (`value?.property ?? default`) is an extremely common pattern.

### Encapsulation through selective exports
The `rolePermissions` object is intentionally not exported. Only `hasPermission` is. This means the rest of the codebase depends on the function's interface, not its internal data structure. You could replace the object with a database query tomorrow without breaking anything.

### The principle of least privilege
Each role gets the minimum set of permissions it needs. This is not just a security best practice -- it also makes the system easier to reason about. When you see `finance`, you know exactly what they can and cannot do.

---

## Common Mistakes

1. **Checking roles instead of permissions.** The whole point of RBAC is to decouple "who you are" from "what you can do." Code like `if (role === "super_admin" || role === "ops_lead")` defeats the purpose. Always check `hasPermission(role, "some.permission")` instead. If you later create a new role that also needs that permission, you only update the matrix, not every `if` statement in the codebase.

2. **Forgetting `as const`.** If you remove `as const` from `permissionKeys`, the type becomes `string[]`, and `PermissionKey` becomes `string`. You lose all type safety on permissions. TypeScript will happily let you pass `"foobar"` as a permission, which defeats the point.

3. **Defaulting to `true` on errors.** Some developers write `?? true` as a fallback, thinking "if something goes wrong, just let them through." This is a security hole. Always default to denial (`?? false`). It is better for a user to see a "you don't have permission" error than for them to accidentally access data they should not see.

4. **Duplicating the permission list.** If you need to check multiple permissions, do not copy-paste strings. Import `PermissionKey` and let TypeScript validate them. If you typo a permission string in a `hasPermission` call, TypeScript will catch it -- but only if the parameter is typed as `PermissionKey`.

---

## Mini Exercises

### Exercise 1: Add a new permission
Add a permission called `"reports.export"` to `permissionKeys`. Then grant it to `super_admin`, `ops_lead`, and `finance`. Verify that TypeScript automatically includes it in the `PermissionKey` type (try passing it to `hasPermission` -- it should work without errors). Verify that `super_admin` gets it automatically via the spread.

### Exercise 2: Derive Role from an array
Refactor the `Role` type to use the same `as const` + `typeof` pattern as `PermissionKey`. Create a `roles` array, add `as const`, then derive `Role` from it. This gives you both a runtime array of roles and a compile-time type, which is useful when you need to iterate over all roles (for example, in a settings UI).

### Exercise 3: Write a "list my permissions" function
Write a function called `getPermissions(role: Role): PermissionKey[]` that returns the array of permissions for a given role. Think about whether you should return the original array or a copy. (Hint: what happens if the caller does `.push("fake.permission")` on the returned array? Would that mutate the internal `rolePermissions` object?)

---

## Further Reading

- **TypeScript `as const` and literal types**: The TypeScript Handbook section on "const assertions" explains how `as const` narrows inference.
- **RBAC vs ABAC**: Role-Based vs Attribute-Based Access Control. RBAC maps roles to permissions; ABAC uses attributes (like department, time of day, resource owner) for more granular control.
- **The `Record` utility type**: TypeScript docs on utility types. Also look at `Partial`, `Pick`, and `Omit` -- they are used constantly.
- **Nullish coalescing vs logical OR**: `??` only triggers on `null`/`undefined`, while `||` triggers on any falsy value (`0`, `""`, `false`). Know when to use which.
- **Defense in depth**: Why checking permissions in multiple layers (UI, API route, database) is better than checking in just one place.
