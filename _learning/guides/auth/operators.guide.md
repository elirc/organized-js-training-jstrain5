# Guide: Operator Records (`src/lib/auth/operators.ts`)

## Purpose

This file defines **who can log into the application**. It is a hardcoded list of operator (user) accounts, each with a name, email, role, and department. It also exports a shared default password that every operator uses.

In a real production system, this data would live in a database and passwords would be hashed. This file exists because the project is a demo/internal tool, so it trades security for convenience. That is an important distinction to understand early: **not every shortcut you see in a codebase is a best practice**. Sometimes code exists to get something working quickly, and you should be able to tell the difference.

---

## Line-by-Line Walkthrough

```typescript
import type { Role } from "@/lib/auth/rbac";
```

This imports the `Role` type from the RBAC (Role-Based Access Control) module. The `type` keyword after `import` tells TypeScript "I only need this at compile time, not at runtime." This matters because TypeScript strips out type-only imports when it compiles to JavaScript, keeping your bundle smaller. The `@/` prefix is a path alias configured in `tsconfig.json` that points to the project root, so you do not have to write fragile relative paths like `../../auth/rbac`.

```typescript
export type OperatorRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
};
```

This defines a TypeScript type alias called `OperatorRecord`. It describes the shape of a single operator object. Notice that `role` is not just `string` -- it uses the `Role` type imported above. That means if you try to create an operator with `role: "wizard"`, TypeScript will flag it as an error at compile time. This is one of the biggest practical benefits of TypeScript: catching invalid data before your code ever runs.

The `export` keyword makes this type available to other files. Any file that needs to know what an operator looks like can import `OperatorRecord` instead of guessing or duplicating the shape.

```typescript
export const operators: OperatorRecord[] = [
```

This creates an array of `OperatorRecord` objects and exports it. The `: OperatorRecord[]` annotation tells TypeScript "every item in this array must match the `OperatorRecord` shape." If you add an object missing the `department` field, TypeScript will complain immediately.

```typescript
  { id: "op_001", name: "Alex Rivera", email: "alex@novacom.internal", role: "super_admin", department: "Engineering" },
  { id: "op_002", name: "Jordan Lee", email: "jordan@novacom.internal", role: "ops_lead", department: "Operations" },
  { id: "op_003", name: "Morgan Chen", email: "morgan@novacom.internal", role: "ops_engineer", department: "Operations" },
  { id: "op_004", name: "Riley Santos", email: "riley@novacom.internal", role: "support", department: "Support" },
  { id: "op_005", name: "Avery Johnson", email: "avery@novacom.internal", role: "finance", department: "Finance" },
];
```

Five hardcoded operator records. Each one has a unique `id` prefixed with `op_`, a human-readable `name`, an internal email address, a `role` that maps to the RBAC system, and a `department`. Notice the IDs use a consistent prefix pattern (`op_001`, `op_002`, etc.). This is a common convention that makes IDs easier to recognize in logs, URLs, and database queries. You can glance at `op_003` and immediately know it is an operator, not a customer or an incident.

Also notice: every operator has a different role. This is intentional so you can test the permission system by logging in as different people and seeing different parts of the UI.

```typescript
export const DEFAULT_OPERATOR_PASSWORD = "password123";
```

A single shared password for all operators. This is exported so the auth config file can compare against it during login.

**Let's be honest about this line.** In any real application, this would be a serious security problem. Passwords should be hashed (using bcrypt, argon2, or similar), stored per-user, and never appear as plaintext in source code. This exists here purely for demo convenience. If you ever see something like this in a production codebase, treat it as a bug to fix, not a pattern to follow.

---

## Concepts Taught

### Type aliases with `type`
A type alias gives a name to a shape of data. It does not create a class or generate any JavaScript at runtime. It only exists at compile time for TypeScript's type checker. Think of it like a blueprint that says "any object claiming to be an `OperatorRecord` must have these exact fields with these exact types."

### Typed arrays (`OperatorRecord[]`)
When you annotate an array with a type, TypeScript enforces that every element matches. This catches mistakes like misspelling a role or forgetting a required field before you ever run the code.

### The `@/` path alias
Instead of writing `import { Role } from "../../auth/rbac"`, the project uses `@/lib/auth/rbac`. This is configured in `tsconfig.json` under `paths`. It makes imports more readable and prevents them from breaking when you move files around.

### Type-only imports (`import type`)
Adding `type` after `import` signals that the import is only used for type checking. The TypeScript compiler can safely remove it from the output JavaScript. It is a small optimization, but it also makes your intent clearer to other developers: "I am using this for type information, not runtime behavior."

### Seed data patterns
Hardcoded data arrays like this are sometimes called "seed data." They are useful for demos, tests, and local development. The important thing is to recognize when seed data is appropriate (prototypes, demos) versus when it is not (production user management).

---

## Common Mistakes

1. **Forgetting to update the type when adding a field.** If you add a `phone` field to one operator object but do not add it to `OperatorRecord`, TypeScript will catch it. But if you add it to `OperatorRecord` as optional (`phone?: string`), TypeScript will not force you to add it to existing records. Be deliberate about whether new fields are required or optional.

2. **Assuming this pattern scales.** Hardcoded arrays work for 5 operators. They do not work for 5,000. When you need to add, remove, or update users without redeploying the application, you need a database. Recognize this file for what it is: a shortcut for a small project.

3. **Using the shared password pattern elsewhere.** It is tempting to copy this approach for quick prototyping. Even in a prototype, get in the habit of at least hashing passwords. Libraries like `bcrypt` add only a few lines of code and build a much better muscle memory.

4. **Importing the value when you only need the type.** If another file only uses `OperatorRecord` for type annotations and never references the `operators` array at runtime, it should use `import type { OperatorRecord }` instead of `import { OperatorRecord }`. This keeps the runtime bundle clean.

---

## Mini Exercises

### Exercise 1: Add a new operator
Add a sixth operator with `id: "op_006"`, `name: "Casey Park"`, `email: "casey@novacom.internal"`, `role: "viewer"`, and `department: "Marketing"`. After adding it, check that TypeScript does not complain. Then try removing the `department` field and see what error you get.

### Exercise 2: Make a field optional
Add an optional `phone` field to `OperatorRecord` (use `phone?: string`). Then add a phone number to just one or two operators. Verify that TypeScript is happy with operators that have it and operators that do not. Think about when you would make a field optional versus required.

### Exercise 3: Break the type on purpose
Change one operator's `role` to `"wizard"` and observe the TypeScript error. Read the error message carefully -- it tells you exactly which values are allowed. This is TypeScript's type narrowing at work, powered by the `Role` union type defined in `rbac.ts`.

---

## Further Reading

- **TypeScript type aliases vs interfaces**: When to use `type` vs `interface` for object shapes. (TypeScript Handbook, "Everyday Types" section)
- **Password hashing with bcrypt**: How real applications store passwords securely. (OWASP Password Storage Cheat Sheet)
- **Path aliases in TypeScript**: How `tsconfig.json` paths work and how bundlers like Next.js resolve them.
- **Seed data and database seeding**: How production apps populate initial data using migration and seed scripts (Prisma seeding docs are a good starting point).
- **The principle of least privilege**: Why each operator has a different role and why you should never give everyone `super_admin`.
