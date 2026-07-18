# Guide: Approval Policies

**File:** `src/lib/approvals/policies.ts`

## Purpose

This file answers a single question: "Does this operation need a human to approve it before it runs?"

In production systems, you do not want every action to just fire immediately. Imagine a junior engineer accidentally running a command that deletes 10,000 customer records. An approval policy is a safety gate -- it looks at what someone is trying to do and decides whether another person needs to sign off first.

This particular policy checks two conditions: whether the command involves deletion, and whether it affects a large number of targets. If either is true, the operation gets flagged for approval.

## The Code

```typescript
export function requiresApproval(command: string, targetCount: number) {
  return command.includes("delete") || targetCount > 100;
}
```

## Line-by-Line Walkthrough

### `export function requiresApproval(command: string, targetCount: number) {`

- `export` makes this function available to other files. Without it, the function would be private to this module.
- `function requiresApproval` -- the name is a yes/no question, which is a strong hint that this returns a boolean. Good naming convention.
- `command: string` -- the operation the user wants to perform, like `"delete-accounts"` or `"update-billing"`.
- `targetCount: number` -- how many things (customers, records, servers, etc.) this operation will affect.

### `return command.includes("delete") || targetCount > 100;`

This is a single expression that returns `true` or `false`. Let's break it apart:

- `command.includes("delete")` -- checks if the word "delete" appears anywhere in the command string. This is a simple substring search, not exact matching.
- `||` -- logical OR. If *either* side is true, the whole thing is true.
- `targetCount > 100` -- any operation touching more than 100 targets needs approval, regardless of what the command is.

The function returns the result directly. There is no `if/else` needed because the expression itself evaluates to a boolean.

## Honesty About Code Quality

This implementation is a scaffold -- it works, but a production version would need more thought:

- **String matching is fragile.** `command.includes("delete")` would also match `"undelete"` or `"delete-preview"`. A real system might use an enum or a list of known dangerous commands instead of substring matching.
- **The magic number 100 is hardcoded.** In a real codebase, this threshold would likely come from configuration so you can change it without redeploying.
- **There's no logging.** When an operation is flagged for approval, you'd typically want to log that decision for auditing purposes.

That said, the *shape* of the code is right. A policy function that takes inputs and returns a boolean is exactly the pattern you want.

## Concepts Taught

1. **Pure functions** -- This function takes inputs and returns an output. It does not modify anything, does not call a database, and does not depend on global state. Pure functions are easy to test and easy to reason about.
2. **Boolean expressions as return values** -- Instead of writing `if (condition) return true; else return false;`, you can return the condition directly. This is more concise and idiomatic.
3. **Policy pattern** -- Separating "should we do this?" from "do this" is a fundamental architectural idea. The policy function does not perform the approval; it just decides whether one is needed.
4. **Guard conditions with `||`** -- Using logical OR to combine multiple independent conditions that each trigger the same outcome.

## Common Mistakes

1. **Writing `if (x) return true; else return false;`** -- This is the most common beginner pattern. If your function already evaluates to a boolean, just return the expression. The `if` wrapper adds nothing.

2. **Confusing `includes` with `===`** -- `"delete-accounts".includes("delete")` is `true`, but `"delete-accounts" === "delete"` is `false`. Know which one you need.

3. **Forgetting that `||` short-circuits** -- If `command.includes("delete")` is `true`, JavaScript does not even evaluate `targetCount > 100`. This matters when the right side has side effects (this function doesn't, but it's worth knowing).

4. **Not exporting the function** -- If you forget `export`, you will get confusing "is not a function" errors in the importing file. TypeScript's error message for this is actually helpful, but it trips people up.

## Mini Exercises

### Exercise 1: Add a Third Condition
Add a check so that any command containing `"suspend"` also requires approval. Make sure both `"delete"` and `"suspend"` checks work together.

<details>
<summary>Hint</summary>
You just need another `||` clause: `command.includes("suspend")`.
</details>

### Exercise 2: Make the Threshold Configurable
Refactor the function so the target count threshold (currently 100) is passed in as a third parameter with a default value. This way callers can override it when needed.

<details>
<summary>Hint</summary>
TypeScript supports default parameters: `threshold: number = 100`.
</details>

### Exercise 3: Write a Test
Write a simple test (even just in a scratch file) that calls `requiresApproval` with these inputs and checks the results:
- `("update-config", 5)` should return `false`
- `("delete-records", 5)` should return `true`
- `("update-config", 200)` should return `true`
- `("delete-records", 200)` should return `true`

## Further Reading

- **Pure functions** -- Search for "pure functions in functional programming" to understand why side-effect-free functions are valuable.
- **Policy vs. mechanism separation** -- A classic software design principle. The policy (should we?) is separate from the mechanism (how do we?).
- **TypeScript string literal unions** -- An alternative to string matching that gives you compile-time safety. Look into `type Command = "delete" | "update" | "suspend"`.
- **Feature flags for thresholds** -- In production, magic numbers like 100 often live in configuration systems so they can be changed without code changes.
