# Guide: Operation Command Base Type

**File:** `src/lib/operations/commands/base.ts`

## Purpose

This file defines the **shape** of every operation command in the system. It is a single TypeScript type -- no runtime code at all -- and yet it is arguably the most important file in the entire operations module. Every one of the 17 command files must conform to this type. If you change it, you change the contract for everything.

Think of it as a blueprint. A blueprint does not build a house, but every house on the street has to follow it.

## The Code

```typescript
export type OperationCommand = {
  key: string;
  dryRun: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  execute: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
};
```

That is the entire file. Four lines of actual content. Let's break every piece apart.

## Line-by-Line Walkthrough

### `export type OperationCommand = {`

- `export` makes this type available to other files. Without it, nobody else could import it.
- `type` declares a TypeScript type alias. This is erased at compile time -- it produces zero JavaScript. It exists purely to help you and the compiler catch mistakes.
- `OperationCommand` is the name. It is PascalCase because that is the convention for types and interfaces in TypeScript.
- The `=` and opening `{` begin an object type definition. We are saying "an OperationCommand is an object that looks like this."

### `key: string;`

Every command gets a unique string identifier. In practice, these are dot-notation names like `"customer.plan.change"` or `"billing.refund"`. The type does not enforce dot-notation -- it just says "any string." That is a design choice worth noting. A stricter type could use a template literal type to enforce the pattern, but the authors kept it simple.

### `dryRun: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;`

This is a function signature. Let's unpack the pieces:

- `dryRun` is the property name. It describes a function that **simulates** the command without making real changes.
- `(payload: Record<string, unknown>)` -- the function takes one argument called `payload`. `Record<string, unknown>` means "an object whose keys are strings and whose values can be anything." This is a very loose type. It is basically saying "pass me any object." In a production system you would usually tighten this with generics or specific payload types, but for scaffolding this works.
- `=> Promise<Record<string, unknown>>` -- the function returns a Promise that resolves to another generic object. The `Promise` tells us this is an **async** operation. Even if the current implementation does nothing slow, marking it async from day one means you will not have to refactor every caller when you eventually add database calls or network requests.

### `execute: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;`

Identical signature to `dryRun`, different name. This is the function that does the **real** work -- actually changes a plan, issues a refund, rotates a key, etc.

### `};`

Closes the type definition. That is all there is.

## Concepts Taught

### 1. Type Aliases vs Interfaces

TypeScript gives you two ways to describe object shapes: `type` and `interface`. This file uses `type`. Either would work here. The practical differences are subtle -- interfaces can be extended with `extends` and merged across declarations; types can represent unions and intersections more naturally. For a simple object shape like this, the choice is mostly a team convention.

### 2. `Record<string, unknown>`

`Record<K, V>` is a built-in TypeScript utility type. `Record<string, unknown>` means "an object where every key is a string and every value is `unknown`." Why `unknown` instead of `any`? Because `unknown` is the **safe** version. If you receive an `unknown` value, TypeScript forces you to check what it is before you use it. With `any`, the compiler looks the other way entirely. Using `unknown` is a small act of discipline.

### 3. The Dry-Run / Execute Pattern

This is a real-world pattern you will encounter in operations tooling, CI/CD pipelines, infrastructure-as-code (Terraform's `plan` vs `apply`), and deployment systems. The idea is simple: before you do something dangerous, you simulate it first. The type bakes this into the contract -- every command **must** support both modes. You cannot create a command that only executes without also providing a dry-run. That is a safety guardrail enforced by the type system.

### 4. Async by Default

Both functions return `Promise`. Even when the current implementations are trivial and synchronous, the type declares them as async. This is forward-thinking. When you eventually add real logic (database queries, API calls, queue publishing), every caller is already expecting a Promise. No refactoring needed.

### 5. Loose Typing as Scaffolding Strategy

`Record<string, unknown>` for both input and output is deliberately loose. In a mature codebase you might see generics like `OperationCommand<TPayload, TResult>`. The current approach trades type safety for speed of iteration -- you can add new commands without defining payload types for each one. This is honest scaffolding: it gets the structure right and leaves the specifics for later.

## Common Mistakes

### 1. Confusing `type` with runtime code

New developers sometimes think `export type` creates something that exists at runtime. It does not. After compilation, this file produces an empty JavaScript file. You cannot do `instanceof OperationCommand` or log it to the console. It is purely a compile-time concept.

### 2. Using `any` instead of `unknown`

It is tempting to write `Record<string, any>` because `any` is less annoying -- the compiler never complains. But `any` disables type checking entirely for those values. `unknown` forces you to narrow the type before using it, which catches bugs. Prefer `unknown`.

### 3. Forgetting `export`

If you define a type without `export`, no other file can import it. You will get "Module has no exported member" errors. This is easy to miss when you are writing code in one file and testing it in another.

### 4. Assuming the payload shape is validated

`Record<string, unknown>` does not validate anything. It just says "this is some object." If someone passes `{ foo: 42 }` to a command that expects `{ customerId: string, planId: string }`, TypeScript will not catch it because the type is too loose. Validation has to happen at runtime (see the validators guide).

## Mini Exercises

### Exercise 1: Add a Metadata Property

Add an optional `meta` property to the `OperationCommand` type that holds a `description` (string) and a `dangerLevel` (one of `"low"`, `"medium"`, or `"high"`). Write the type so that `meta` is not required -- commands can omit it.

<details>
<summary>Hint</summary>

Use a `?` after the property name to make it optional. Use a union type (`"low" | "medium" | "high"`) for `dangerLevel`.
</details>

### Exercise 2: Make It Generic

Rewrite `OperationCommand` as a generic type `OperationCommand<TPayload, TResult>` so that `dryRun` and `execute` both take `TPayload` and return `Promise<TResult>`. Then write a type alias `AnyCommand` that sets both generics to `Record<string, unknown>` (matching the current behavior).

<details>
<summary>Hint</summary>

```typescript
export type OperationCommand<TPayload, TResult> = {
  key: string;
  dryRun: (payload: TPayload) => Promise<TResult>;
  execute: (payload: TPayload) => Promise<TResult>;
};

export type AnyCommand = OperationCommand<Record<string, unknown>, Record<string, unknown>>;
```
</details>

### Exercise 3: Spot the Problem

A teammate writes this:

```typescript
import type { OperationCommand } from "@/lib/operations/commands/base";

const cmd: OperationCommand = {
  key: "test.command",
  dryRun: (payload) => ({
    mode: "dry-run",
    payload,
  }),
  execute: async (payload) => ({
    mode: "execute",
    payload,
  }),
};
```

There is a subtle bug. `dryRun` is missing `async` (or an explicit `Promise` return). The type says it must return a `Promise`, but a plain arrow function returning an object literal returns the object directly, not a Promise. `execute` is fine because it uses `async`. Find and fix it.

## Further Reading

- **TypeScript Handbook -- Type Aliases:** The official docs on `type` vs `interface` and when to use each.
- **TypeScript Handbook -- Utility Types:** Covers `Record`, `Partial`, `Pick`, `Omit`, and other built-in helpers.
- **The Command Pattern (design patterns):** The GoF command pattern is the formal version of what this type describes -- encapsulating an action as an object.
- **Terraform Plan vs Apply:** A real-world example of the dry-run / execute pattern in infrastructure tooling.
- **`unknown` vs `any` in TypeScript:** Understanding why `unknown` is the safer choice and how to narrow it.
