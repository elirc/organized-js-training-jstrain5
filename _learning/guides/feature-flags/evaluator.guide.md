# Guide: Feature Flag Evaluator

**File:** `src/lib/feature-flags/evaluator.ts`

## Purpose

This is the brain of the feature flag system. Given a flag definition and a customer, it answers the question: "Should this customer see this feature?"

Feature flags are one of the most important tools in modern software delivery. They let you deploy code to production without activating it for everyone. You can turn features on for specific customers, roll them out gradually to a percentage of users, or target based on plan type or region.

This file ties together the hashing logic from `rollout.ts` with type definitions and targeting rules to make that decision.

## The Code

```typescript
import { hashToBucket } from "@/lib/feature-flags/rollout";

type FlagType = "boolean" | "percentage" | "targeted";

type FeatureFlag = {
  key: string;
  flagType: FlagType;
  isEnabled: boolean;
  rolloutPercentage: number;
  targetingRules: Array<{ plan?: string; region?: string; customerIds?: string[] }>;
};

type Customer = { id: string; plan: string; region: string; };

export function evaluateFlag(flag: FeatureFlag, customer: Customer): boolean {
  if (!flag.isEnabled) return false;
  if (flag.flagType === "boolean") return true;
  if (flag.flagType === "percentage") {
    const bucket = hashToBucket(flag.key, customer.id);
    return bucket < flag.rolloutPercentage;
  }
  return flag.targetingRules.some((rule) => {
    if (rule.plan && rule.plan !== customer.plan) return false;
    if (rule.region && rule.region !== customer.region) return false;
    if (rule.customerIds && !rule.customerIds.includes(customer.id)) return false;
    return true;
  });
}
```

## Line-by-Line Walkthrough

### The Import

```typescript
import { hashToBucket } from "@/lib/feature-flags/rollout";
```

Imports the hashing function from the rollout module. The `@/` is a path alias (configured in `tsconfig.json`) that points to the `src/` directory. This is cleaner than relative paths like `"../../feature-flags/rollout"`.

### Type Definitions

```typescript
type FlagType = "boolean" | "percentage" | "targeted";
```

A union type defining the three kinds of flags:
- `"boolean"` -- simple on/off. Either everyone gets it or nobody does.
- `"percentage"` -- rolled out to a percentage of customers using the hash-to-bucket mechanism.
- `"targeted"` -- turned on for specific customers based on rules (plan, region, customer ID).

```typescript
type FeatureFlag = {
  key: string;
  flagType: FlagType;
  isEnabled: boolean;
  rolloutPercentage: number;
  targetingRules: Array<{ plan?: string; region?: string; customerIds?: string[] }>;
};
```

The full flag definition. A few things to notice:
- `isEnabled` is a master switch. If false, the flag is off for everyone regardless of type.
- `rolloutPercentage` is only meaningful when `flagType` is `"percentage"`, but it exists on every flag. This is a tradeoff -- it simplifies the type but allows nonsensical combinations (like a boolean flag with `rolloutPercentage: 50`).
- `targetingRules` is an array of rule objects. Each rule can specify a `plan`, a `region`, and/or specific `customerIds`. All fields are optional (marked with `?`).

```typescript
type Customer = { id: string; plan: string; region: string; };
```

A minimal customer representation. Just enough data to evaluate the rules.

### The Evaluator Function

```typescript
export function evaluateFlag(flag: FeatureFlag, customer: Customer): boolean {
```

Takes a flag and a customer, returns true (show the feature) or false (hide it). The return type is explicitly annotated as `boolean`, which is good practice for a function this important.

```typescript
  if (!flag.isEnabled) return false;
```

The master kill switch. If the flag is disabled, return false immediately. This is the first check because it overrides everything else. Early return pattern again.

```typescript
  if (flag.flagType === "boolean") return true;
```

If we reach this line, we know `isEnabled` is true (the previous check would have returned otherwise). For boolean flags, that is all we need to know. Flag is enabled, flag is boolean, so the feature is on for everyone.

```typescript
  if (flag.flagType === "percentage") {
    const bucket = hashToBucket(flag.key, customer.id);
    return bucket < flag.rolloutPercentage;
  }
```

For percentage flags: hash the customer into a bucket (0-99), then check if their bucket is below the rollout percentage. If `rolloutPercentage` is 30, then customers in buckets 0-29 (30% of the range) get the feature. This is where the deterministic hashing from `rollout.ts` pays off -- the same customer always lands in the same bucket.

```typescript
  return flag.targetingRules.some((rule) => {
    if (rule.plan && rule.plan !== customer.plan) return false;
    if (rule.region && rule.region !== customer.region) return false;
    if (rule.customerIds && !rule.customerIds.includes(customer.id)) return false;
    return true;
  });
```

This is the targeting logic for `"targeted"` flags. Let's unpack it:

- **`.some()`** -- Returns true if *any* rule matches. Rules are OR'd together: if the customer matches rule 1 OR rule 2 OR rule 3, they get the feature.
- **Within each rule, conditions are AND'd** -- The customer must match *all* specified conditions in a rule. If a rule says `{ plan: "enterprise", region: "us-east" }`, the customer must be on the enterprise plan AND in us-east.
- **Optional fields are skipped** -- `if (rule.plan && ...)` means "if a plan is specified in this rule, check it." If `rule.plan` is undefined, the check is skipped entirely. This means a rule like `{ region: "eu-west" }` matches any customer in eu-west regardless of their plan.
- **`return true` at the end** -- If none of the conditions disqualified the customer, the rule matches.

The combination of `.some()` for OR across rules and early-return `false` for AND within rules is an elegant pattern. Read it carefully -- it is compact but dense.

### Implicit Handling of Unknown Flag Types

There is no explicit `else` or default case. If `flagType` is somehow not `"boolean"`, `"percentage"`, or `"targeted"` (which TypeScript's type system should prevent), the function falls through to the targeting rules check. In a more defensive implementation, you might throw an error for unknown flag types.

## Honesty About Code Quality

This is the most substantial function in the feature flags module and it is well-structured. Some honest observations:

- **The type design has a flaw.** Every `FeatureFlag` has `rolloutPercentage` and `targetingRules`, even when its `flagType` makes those fields irrelevant. A discriminated union would be better: different types for `BooleanFlag`, `PercentageFlag`, and `TargetedFlag`, each with only the fields they need.
- **No logging or telemetry.** In production, you would want to know how often each flag is evaluated and what the results are. This data drives decisions about when to remove flags.
- **Empty targeting rules.** If `targetingRules` is an empty array, `.some()` returns `false`, so the feature is off for everyone. Is that the intended behavior? It might surprise someone who expects an empty rules array to mean "no restrictions."
- **The `customerIds` check uses `.includes()`.** For a small list of IDs, this is fine. For thousands of IDs, you would want a `Set` for O(1) lookup instead of O(n) scanning.

Despite these notes, the control flow is clean and easy to follow. The early return pattern, combined with `.some()` for rule matching, makes the logic readable.

## Concepts Taught

1. **Discriminated evaluation** -- The function behaves differently based on `flagType`. This is a common pattern: look at a "type" or "kind" field to decide which logic path to follow. TypeScript can narrow types based on these checks (look into discriminated unions).

2. **`.some()` for rule matching** -- `Array.some()` returns true if any element passes the test. Combined with early-return-false inside the callback, it creates a clean AND/OR rule evaluation system. This is a pattern you will use in authorization, filtering, and validation.

3. **Optional property checking** -- The `if (rule.plan && rule.plan !== customer.plan)` pattern checks both "is this field present?" and "does it match?" in a single expression. The first part (`rule.plan`) is falsy if undefined, so the second check only runs when the field exists.

4. **Combining modules** -- This file imports from `rollout.ts` and uses its hashing function. This demonstrates how you build complex behavior by composing simple, focused modules. Each module does one thing well.

5. **Layered conditions** -- The function has multiple "layers" of checks: master switch, flag type, then type-specific logic. This layered approach makes it easy to add new flag types without restructuring the existing code.

## Common Mistakes

1. **Confusing `.some()` with `.every()`** -- `.some()` returns true if *any* callback returns true (OR logic). `.every()` returns true if *all* callbacks return true (AND logic). Mixing these up inverts your logic entirely.

2. **Forgetting that `undefined && x` is `undefined` (falsy)** -- The check `rule.plan && rule.plan !== customer.plan` relies on short-circuit evaluation. If `rule.plan` is undefined, the whole expression is `undefined` (falsy), and the `if` block is skipped. This is correct behavior but can confuse beginners who expect a boolean.

3. **Not handling empty arrays** -- `[].some(() => true)` is `false`. If you expect empty targeting rules to mean "match everyone," you need an explicit check for empty arrays before calling `.some()`.

4. **Mutating the flag object** -- This function reads from `flag` but does not modify it. If you accidentally wrote `flag.isEnabled = true` somewhere, you would be mutating shared state, which causes subtle bugs. Always treat function parameters as read-only unless you have a clear reason to modify them.

## Mini Exercises

### Exercise 1: Add a Default Case
Add an explicit check for unknown flag types. If `flagType` is not one of the three known types, throw an error with a message like `"Unknown flag type: ..."`. This is defensive programming.

<details>
<summary>Hint</summary>

Before the final `return`, add:

```typescript
if (flag.flagType !== "targeted") {
  throw new Error(`Unknown flag type: ${flag.flagType}`);
}
```

Or even better, use TypeScript's `never` type to get a compile-time check. Look into exhaustive switch statements.
</details>

### Exercise 2: Add Evaluation Logging
Modify the function to log (using `console.log`) each evaluation result: the flag key, customer ID, and whether the feature is on or off. Think about where to place the logging so you capture *all* paths, not just some.

<details>
<summary>Hint</summary>

One approach: compute the result into a variable, log it, then return it:

```typescript
export function evaluateFlag(flag: FeatureFlag, customer: Customer): boolean {
  const result = evaluateFlagInternal(flag, customer);
  console.log(`[flag] ${flag.key} for ${customer.id}: ${result}`);
  return result;
}
```

Wrapping in a helper avoids duplicating the log call at every return point.
</details>

### Exercise 3: Trace Through a Targeted Flag
Given this flag and customer, trace through the code by hand and predict the result:

```typescript
const flag: FeatureFlag = {
  key: "premium-dashboard",
  flagType: "targeted",
  isEnabled: true,
  rolloutPercentage: 0,
  targetingRules: [
    { plan: "enterprise", region: "us-east" },
    { customerIds: ["cust_42"] },
  ],
};

const customer: Customer = { id: "cust_99", plan: "enterprise", region: "eu-west" };
```

Does the customer get the feature? Walk through each rule.

<details>
<summary>Answer</summary>

- `isEnabled` is true, so we continue.
- `flagType` is "targeted", so we skip the boolean and percentage checks.
- Rule 1: `{ plan: "enterprise", region: "us-east" }`. Customer plan is "enterprise" (matches), but region is "eu-west" (does not match "us-east"). Rule 1 fails.
- Rule 2: `{ customerIds: ["cust_42"] }`. Customer ID is "cust_99" (not in the list). Rule 2 fails.
- `.some()` returns false. The customer does NOT get the feature.
</details>

## Further Reading

- **Discriminated unions in TypeScript** -- A way to model the `FeatureFlag` type more precisely. Each flag type would be its own type with only the relevant fields. Search for "TypeScript discriminated unions."
- **Feature flag best practices** -- Martin Fowler's article "Feature Toggles" is the canonical reference. It discusses different categories of flags (release, experiment, ops, permission) and lifecycle management.
- **Array methods (`.some()`, `.every()`, `.filter()`, `.map()`)** -- These are the workhorses of modern JavaScript. MDN's documentation is excellent. Practice using them instead of `for` loops.
- **Short-circuit evaluation** -- Understanding how `&&` and `||` work with non-boolean values in JavaScript is essential. It is used heavily in React JSX and in patterns like the optional checks in this file.
