# Guide: Command Registry

**File:** `src/lib/operations/commands/registry.ts`

## Purpose

The registry is a **lookup table** for commands. Instead of importing each command file directly wherever you need it, you register commands once and then retrieve them by key. This is a classic pattern called a **service registry** (or service locator).

Why does this matter? Imagine you have 17 commands today and 50 next quarter. Without a registry, every piece of code that needs to run a command would have a giant import block and a switch statement. With a registry, the consumer just says `getCommand("billing.refund")` and gets back the right object. The consumer does not need to know which file it came from, how it was constructed, or even that it exists at compile time.

## The Code

```typescript
import type { OperationCommand } from "@/lib/operations/commands/base";

const registry = new Map<string, OperationCommand>();

export function registerCommand(command: OperationCommand) {
  registry.set(command.key, command);
}

export function getCommand(key: string) {
  return registry.get(key);
}
```

## Line-by-Line Walkthrough

### `import type { OperationCommand } from "@/lib/operations/commands/base";`

This pulls in the `OperationCommand` type we covered in the base guide. The `type` keyword in the import tells TypeScript (and bundlers) that this is a type-only import -- it will be completely removed at compile time. No runtime code is imported, just the type information the compiler needs to check our work.

### `const registry = new Map<string, OperationCommand>();`

This is the heart of the file. Let's break it down:

- `const registry` -- a module-level variable. Because it is not exported, **no other file can touch it directly**. This is intentional. The only way to interact with the registry is through the two exported functions below. This is a form of **encapsulation**.
- `new Map<string, OperationCommand>()` -- creates a JavaScript `Map`. The generic parameters `<string, OperationCommand>` tell TypeScript that keys are strings and values are `OperationCommand` objects. A `Map` is like a plain object (`{}`) but better for dynamic key-value storage: it preserves insertion order, has a clean API (`.set()`, `.get()`, `.has()`, `.delete()`), and does not have prototype pollution issues.

Because this variable lives at the **module level** (not inside a function), it is created once when the module is first imported and then shared by every caller. This is effectively a **singleton** -- there is one registry for the whole application.

### `export function registerCommand(command: OperationCommand) {`

This is the "write" side of the registry. You pass in a command object, and it gets stored.

- `export` makes the function available to other files.
- The parameter `command` has type `OperationCommand`, so TypeScript will refuse to let you register something that does not have `key`, `dryRun`, and `execute`.

### `registry.set(command.key, command);`

Stores the command in the Map, using the command's own `key` property as the lookup key. Notice that if you register two commands with the same key, the second one silently overwrites the first. There is no duplicate check. In a production system, you might want to throw an error or at least log a warning if a key collision happens.

### `export function getCommand(key: string) {`

This is the "read" side. You pass in a key string and get back the command.

### `return registry.get(key);`

`Map.get()` returns `OperationCommand | undefined`. If the key does not exist in the map, you get `undefined`. This is important -- the caller must handle the case where the command is not found. TypeScript knows this because the return type of `Map.get()` includes `undefined`.

## Concepts Taught

### 1. The Registry / Service Locator Pattern

A registry is a central place where things register themselves, and other things look them up by name. You see this pattern everywhere:

- Express.js route handlers (`app.get("/users", handler)`)
- Event emitters (`emitter.on("click", handler)`)
- Dependency injection containers
- Plugin systems

The trade-off: registries make the system **flexible** (easy to add new commands) but **less explicit** (you cannot just grep for imports to find what is connected to what). The connection between a command and its consumer happens at runtime, not at import time.

### 2. Module-Level State (Singleton by Module)

In JavaScript/TypeScript, each module is evaluated once. The first time any file does `import { registerCommand } from "./registry"`, the module runs, creates the `Map`, and caches the result. Every subsequent import gets the same `Map`. This gives you singleton behavior without writing a class or using a framework.

### 3. Encapsulation Without Classes

The `registry` variable is private -- not because of a `private` keyword (that is a class concept), but because it is not exported. This is **module-level encapsulation**. The only way to read or write the registry is through the two exported functions. This means you can change the internal data structure (say, from a `Map` to a database lookup) without breaking any code that uses the registry.

### 4. Map vs Plain Object

You might wonder why use `Map` instead of a plain object `{}`. For a dynamic key-value store where keys are added at runtime, `Map` is the right choice:

| Feature | `Map` | `{}` |
|---|---|---|
| Key types | Any value | Strings and symbols |
| Iteration order | Guaranteed insertion order | Mostly insertion order (with caveats) |
| Size | `.size` property | `Object.keys(obj).length` |
| Prototype keys | No pollution | `"toString"` etc. exist |
| Performance | Optimized for frequent add/remove | Optimized for static shape |

### 5. Return Types and `undefined`

`getCommand` does not have an explicit return type annotation. TypeScript **infers** it as `OperationCommand | undefined` from the `Map.get()` call. This is fine -- inferred types are not less safe than explicit ones. But some teams prefer explicit return types on exported functions for documentation purposes. Either way, any caller must handle the `undefined` case.

## Common Mistakes

### 1. Forgetting to register commands

The registry only knows about commands that have been explicitly registered. If you create a new command file but never call `registerCommand(yourCommand)`, it will not be in the registry and `getCommand` will return `undefined`. There needs to be a bootstrap step somewhere that calls `registerCommand` for each command. If that step misses one, the command is invisible.

### 2. Not handling `undefined` from `getCommand`

```typescript
// BAD -- crashes if key is not found
const cmd = getCommand("typo.in.key");
cmd.execute(payload); // TypeError: Cannot read properties of undefined

// GOOD -- handle the missing case
const cmd = getCommand("typo.in.key");
if (!cmd) {
  throw new Error(`Unknown command: typo.in.key`);
}
cmd.execute(payload);
```

### 3. Assuming registration order does not matter

If command A depends on command B being registered first (unlikely here, but common in plugin systems), the order of `registerCommand` calls matters. Module-level code runs in import order, which can be unpredictable. If ordering matters, make it explicit.

### 4. Silent overwrites

```typescript
registerCommand({ key: "billing.refund", dryRun: ..., execute: ... });
registerCommand({ key: "billing.refund", dryRun: ..., execute: ... }); // silently replaces the first
```

There is no warning. In a real system, you probably want a guard:

```typescript
export function registerCommand(command: OperationCommand) {
  if (registry.has(command.key)) {
    throw new Error(`Command "${command.key}" is already registered.`);
  }
  registry.set(command.key, command);
}
```

## Mini Exercises

### Exercise 1: Add a Duplicate Guard

Modify `registerCommand` so it throws an error if someone tries to register a command with a key that is already in the registry. Write a small test scenario (just pseudocode is fine) that would trigger the error.

<details>
<summary>Hint</summary>

Check `registry.has(command.key)` before calling `registry.set()`.
</details>

### Exercise 2: Add `listCommands`

Add a third exported function called `listCommands` that returns an array of all registered command keys, sorted alphabetically. Think about the return type -- should it be `string[]` or `readonly string[]`?

<details>
<summary>Hint</summary>

```typescript
export function listCommands(): string[] {
  return Array.from(registry.keys()).sort();
}
```

Using `readonly string[]` would prevent callers from accidentally mutating the returned array, which is a nice safety measure.
</details>

### Exercise 3: Add `removeCommand`

Add a `removeCommand(key: string): boolean` function. It should return `true` if the command was found and removed, `false` if it was not in the registry. When might you need this in a real system? (Think: hot-reloading, feature flags, testing.)

<details>
<summary>Hint</summary>

`Map.delete()` already returns a boolean indicating whether the key existed.

```typescript
export function removeCommand(key: string): boolean {
  return registry.delete(key);
}
```
</details>

## Further Reading

- **MDN -- Map:** The full API documentation for JavaScript's `Map` object.
- **Service Locator Pattern:** Martin Fowler's article on the pattern, including its trade-offs vs dependency injection.
- **Module-level singletons in Node.js/TypeScript:** Understanding how module caching creates singleton behavior.
- **TypeScript -- Type Inference:** How and when TypeScript can figure out types without you writing them.
- **Plugin architecture patterns:** How larger systems (VS Code, Webpack, Babel) use registries to support extensibility.
