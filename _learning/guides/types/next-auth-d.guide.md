# Guide: NextAuth Type Declarations (`src/types/next-auth.d.ts`)

## Purpose

This file **extends NextAuth's built-in TypeScript types** to include custom fields (`role`, `department`, `id`) that the project adds to users, sessions, and JWT tokens. Without this file, TypeScript would complain every time you wrote `session.user.role` because the default NextAuth `Session` type does not have a `role` property.

This is a TypeScript **declaration file** (the `.d.ts` extension). It does not contain any runtime code -- no functions, no logic, no JavaScript output. It only contains type information that tells TypeScript "hey, the types you know about for these modules have additional fields." It is invisible at runtime but essential for development: it is the reason you get autocomplete on `session.user.role` and type errors when you typo it as `session.user.rolee`.

If the RBAC file and middleware file are about making permissions work at runtime, this file is about making them work at **development time**.

---

## Line-by-Line Walkthrough

```typescript
import type { DefaultSession } from "next-auth";
```

Imports the `DefaultSession` type from NextAuth. This is the type that describes what a session looks like by default, before any customization. We need it so we can extend the session's user object while keeping all the original fields (like `name`, `email`, and `image`).

The `import type` syntax is important here: in a `.d.ts` file, everything is type-level. This import brings in a type definition, not a runtime value.

```typescript
declare module "next-auth" {
```

This is a **module augmentation** -- one of TypeScript's most powerful (and confusing) features. It says: "I'm going to add to the type definitions that already exist for the `next-auth` module." You are not replacing the existing types; you are merging new declarations into them.

Think of it like this: the `next-auth` package ships with type definitions that say "a `Session` has a `user` with `name`, `email`, and `image`." This `declare module` block says "actually, a `Session` also has these additional fields on `user`."

The string `"next-auth"` must exactly match the module name as it appears in import statements. TypeScript uses this string to figure out which module you are augmenting.

```typescript
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      department: string;
    };
  }
```

This redefines the `Session` interface within the `next-auth` module. Because it is inside `declare module "next-auth"`, TypeScript merges this with the existing `Session` interface.

Let's break down the `user` type:

- **`DefaultSession["user"]`** -- This is an **indexed access type**. It pulls out the type of the `user` property from `DefaultSession`. The default user has `name?: string | null`, `email?: string | null`, and `image?: string | null`.
- **`&`** -- This is an **intersection type**. It combines two types into one that has all properties of both.
- **`{ id: string; role: string; department: string; }`** -- These are the custom fields this project adds.

The result: `session.user` has all the default fields (`name`, `email`, `image`) plus the custom ones (`id`, `role`, `department`). The `&` intersection means it must have everything from both sides.

Why use `DefaultSession["user"] &` instead of just listing all the fields? Because if NextAuth adds new default fields in a future version, this type will automatically include them. You are extending, not replacing.

```typescript
  interface User {
    role: string;
    department: string;
  }
```

This augments the `User` interface. In NextAuth, the `User` type represents the object returned by the `authorize` function in the Credentials provider. By adding `role` and `department` here, you tell TypeScript that when `authorize` returns a user, it can include these fields, and they will be available in the `jwt` callback's `user` parameter.

Notice that `id`, `name`, and `email` are not listed here because they already exist on the default `User` interface. You only need to declare the fields you are adding.

```typescript
declare module "next-auth/jwt" {
```

A second module augmentation, this time for the `next-auth/jwt` module. This is a **separate** module from `next-auth`, so it needs its own `declare module` block.

```typescript
  interface JWT {
    role?: string;
    department?: string;
  }
```

This adds `role` and `department` to the JWT token type. Notice the `?` making them optional. This is important because the `jwt` callback is called on every request, but `role` and `department` are only set on the first call (when the user logs in). On subsequent calls, the token already has them from the previous invocation, but TypeScript does not know that -- from the type system's perspective, they might not be there yet.

The default `JWT` interface already includes fields like `sub` (the user ID), `iat` (issued at), and `exp` (expiration). This augmentation adds project-specific fields alongside them.

```typescript
}
```

End of the `next-auth/jwt` module augmentation.

---

## Concepts Taught

### Declaration files (`.d.ts`)
Files ending in `.d.ts` contain only type declarations -- no runtime code. TypeScript reads them for type information but does not compile them into JavaScript. They are used for: describing the types of JavaScript libraries that do not have TypeScript source, augmenting existing types (like this file does), and declaring global types.

You do not need to import `.d.ts` files explicitly. TypeScript automatically includes them if they are within your `tsconfig.json`'s `include` scope. That is why this file works just by existing in the `src/types/` directory -- no import statement is needed anywhere.

### Module augmentation (`declare module`)
Module augmentation lets you add new members to existing module interfaces without modifying the original library code. TypeScript merges your declarations with the library's declarations. This is how the entire ecosystem of TypeScript type extensions works: `@types/node`, `@types/react`, and many others use similar patterns.

The key rule: module augmentation can **add** new properties to interfaces, but it cannot remove or change the types of existing ones. You are extending, not overriding.

### Intersection types (`&`)
The `&` operator combines two types. `A & B` means "a value that is both A and B -- it has all properties from A and all properties from B." This is different from `A | B` (union), which means "a value that is either A or B." Intersections are used when you want to extend a type with additional fields, as in `DefaultSession["user"] & { id: string; ... }`.

### Indexed access types (`Type["key"]`)
`DefaultSession["user"]` extracts the type of the `user` property from `DefaultSession`. This is like accessing a property on an object, but at the type level. You can chain them: `DefaultSession["user"]["email"]` would give you the type of the email field on the user. This is useful for reusing parts of existing types without redefining them.

### Optional properties in augmentation
The `?` on `role?: string` in the JWT interface acknowledges that the property will not always be present. This matches the runtime reality: the first time the JWT callback runs, these fields might not be on the token yet. TypeScript's optional properties work with optional chaining (`token.role?.toUpperCase()`) to prevent runtime errors.

---

## Common Mistakes

1. **Putting runtime code in a `.d.ts` file.** Declaration files cannot contain implementations. You cannot write `export function foo() { ... }` in a `.d.ts` file. If you need both types and runtime code, use a regular `.ts` file instead.

2. **Using a different module string than the import path.** If you write `declare module "next-auth/core"` but the import in your code is `from "next-auth"`, the augmentation will not apply. The module string must match exactly what appears in import statements.

3. **Forgetting to keep augmentations in sync with callbacks.** If you add a `lastLogin` field to the JWT callback but do not add it to the JWT interface in this file, TypeScript will complain when you try to set `token.lastLogin`. And if you add it to this file but not to the callback, TypeScript will think it exists but it will be `undefined` at runtime. The declaration file and the callbacks must agree.

4. **Accidentally replacing instead of extending.** If you define `Session` without using `DefaultSession["user"] &`, you lose the default fields (`name`, `email`, `image`). Always extend with `&` unless you intentionally want to drop the defaults.

5. **Not understanding why it "just works."** Because `.d.ts` files are auto-included by TypeScript, it can feel magical. If this file is accidentally excluded from `tsconfig.json`'s scope (for example, if `include` does not cover `src/types/`), the augmentations silently stop working. If you suddenly lose type safety on session fields, check your `tsconfig.json` include paths.

---

## Mini Exercises

### Exercise 1: Add a custom field end-to-end
Add a `timezone` field (type `string`) to the auth system. You will need to: (a) add it to the `User` interface in this file, (b) add it to the `JWT` interface in this file, (c) add it to the `Session` interface in this file, (d) return it from the `authorize` function in `config.ts`, (e) copy it to the token in the `jwt` callback, (f) expose it on the session in the `session` callback. This exercise ties together every auth file in the project.

### Exercise 2: Remove the file and observe errors
Temporarily rename this file to `next-auth.d.ts.bak` and run the TypeScript compiler (`npx tsc --noEmit`). Observe every error that appears. Each error shows you a place in the codebase that depends on the augmented types. This helps you understand the blast radius of type declarations. Rename it back when done.

### Exercise 3: Explore `DefaultSession["user"]`
In a scratch TypeScript file, import `DefaultSession` from `next-auth` and use an indexed access type to extract just the `user` type. Hover over it in your editor to see what fields it includes by default. Then try `DefaultSession["user"]["email"]` to see the type of the email field. This exercise builds fluency with indexed access types.

---

## Further Reading

- **TypeScript declaration files**: The TypeScript Handbook section on `.d.ts` files explains their purpose, how they are discovered, and how to write them.
- **Module augmentation vs global augmentation**: Module augmentation (used here) extends a specific module. Global augmentation extends the global scope. The TypeScript docs explain when to use which.
- **TypeScript utility types for extending**: Beyond `&`, look at `Omit`, `Pick`, and `Partial` for more advanced type manipulation. For example, `Omit<DefaultSession["user"], "image"> & { id: string }` would extend the user type but drop the `image` field.
- **The `@types` ecosystem**: How DefinitelyTyped provides `.d.ts` files for JavaScript libraries that do not include their own types. Understanding declaration files is key to contributing to this ecosystem.
- **`tsconfig.json` include and exclude**: How TypeScript decides which files to compile and which declaration files to recognize. Misconfigurations here are a common source of "my types are not working" bugs.
