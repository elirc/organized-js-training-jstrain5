# Guide: Incident Severity Classification

**File:** `src/lib/incidents/severity.ts`

## Purpose

When something breaks in production, you need to know *how badly* it is broken. Not all outages are equal. A typo on a settings page is not the same as the entire payment system going down.

This file takes a measurable metric -- the error rate -- and converts it into a human-readable severity level. Severity levels drive everything downstream: who gets paged, how fast the response needs to be, whether leadership is notified, and what the post-incident review process looks like.

This is a classification function. It takes a continuous value (a decimal number) and maps it to a discrete category (sev1 through sev4).

## The Code

```typescript
export function classifySeverity(errorRate: number) {
  if (errorRate > 0.5) return "sev1";
  if (errorRate > 0.2) return "sev2";
  if (errorRate > 0.08) return "sev3";
  return "sev4";
}
```

## Line-by-Line Walkthrough

### `export function classifySeverity(errorRate: number) {`

- This is a synchronous, pure function. No `async` needed because it is just doing math -- no database, no network calls.
- `errorRate: number` -- a decimal representing the percentage of requests that are failing. `0.5` means 50% of requests are erroring out.

### `if (errorRate > 0.5) return "sev1";`

- If more than 50% of requests are failing, this is the most critical severity. In real incident management, sev1 usually means "all hands on deck, wake people up at 3am, notify the VP of Engineering."
- The function uses early returns. Each `if` statement either returns immediately or falls through to the next check.

### `if (errorRate > 0.2) return "sev2";`

- Between 20% and 50% error rate. This is serious but not catastrophic. Think "significant degradation, some customers affected."
- Because the sev1 check already returned for values above 0.5, this line only runs for values between 0.2 and 0.5 (exclusive on the 0.5 end). The order of these checks matters.

### `if (errorRate > 0.08) return "sev3";`

- Between 8% and 20%. Noticeable but manageable. Maybe a single endpoint is slow or a non-critical service is down.

### `return "sev4";`

- Everything 8% and below. This is the default -- low severity, probably a minor issue. Might not even require an immediate response.

## Honesty About Code Quality

The logic is sound and the pattern is correct, but there are gaps:

- **No input validation.** What happens if someone passes a negative number? Or a number greater than 1? Or `NaN`? The function happily classifies them without complaint. A production version should validate input ranges.
- **Magic numbers.** The thresholds (0.5, 0.2, 0.08) are hardcoded. In a real system, these would be configurable because different teams or services might have different tolerances.
- **No return type annotation.** TypeScript infers the return type as `"sev1" | "sev2" | "sev3" | "sev4"`, which is actually correct and useful. But explicitly annotating it would make the function's contract clearer to readers.
- **Single-metric classification.** Real severity classification usually considers multiple signals: error rate, latency, number of affected customers, revenue impact, etc. Using a single metric is a simplification.

That said, the "cascading if with early returns" pattern is a clean, readable way to handle classification. This is better than a complex nested structure.

## Concepts Taught

1. **Early return pattern** -- Instead of using `if/else if/else`, this function returns immediately from each condition. This keeps the code flat and avoids deep nesting. It is especially clean for classification functions.

2. **Implicit ordering in conditionals** -- The checks go from highest to lowest. Because each `if` returns early, the next check implicitly has a lower bound. `errorRate > 0.2` really means "greater than 0.2 but not greater than 0.5" because we already handled the > 0.5 case. Understand this pattern -- it is everywhere.

3. **Severity levels in incident management** -- sev1/sev2/sev3/sev4 is a real industry convention. Most tech companies use a severity system to prioritize incidents. Understanding this concept is useful beyond just reading code.

4. **Classification functions** -- Taking a continuous input and mapping it to a discrete output. This pattern appears in everything from grading systems to health checks to feature flags.

## Common Mistakes

1. **Getting the order wrong** -- If you checked `errorRate > 0.08` first, everything above 8% would be classified as sev3, including 90% error rates. The order must go from highest to lowest (or lowest to highest with appropriate logic).

2. **Off-by-one on boundaries** -- What should `errorRate === 0.5` return? With the current code, it returns `"sev2"` (not sev1) because the check is `> 0.5`, not `>= 0.5`. Whether this is correct depends on your requirements. Boundary conditions are a common source of bugs.

3. **Not handling edge cases** -- `classifySeverity(-1)` returns `"sev4"`. `classifySeverity(NaN)` also returns `"sev4"` because all comparisons with `NaN` return `false`. Both of these are probably bugs.

4. **Using `else if` when you don't need to** -- With early returns, you do not need `else if`. Each `if` is independent because the prior ones already exited the function. Using `else if` is not wrong, but it adds visual clutter for no benefit.

## Mini Exercises

### Exercise 1: Add Input Validation
Add a check at the top of the function that throws an error if `errorRate` is negative or greater than 1. What should happen if `errorRate` is exactly 0?

<details>
<summary>Hint</summary>

```typescript
if (errorRate < 0 || errorRate > 1) {
  throw new Error(`Invalid error rate: ${errorRate}. Must be between 0 and 1.`);
}
```

An error rate of 0 is valid -- it means nothing is broken. It should return `"sev4"`.
</details>

### Exercise 2: Add an Explicit Return Type
Add a type alias `type Severity = "sev1" | "sev2" | "sev3" | "sev4"` and annotate the function's return type. Then try returning a string like `"sev5"` and see what TypeScript does.

<details>
<summary>Hint</summary>

```typescript
type Severity = "sev1" | "sev2" | "sev3" | "sev4";

export function classifySeverity(errorRate: number): Severity {
  // ...
}
```

TypeScript will give a compile error if you try to return `"sev5"`. That is the point of the return type annotation.
</details>

### Exercise 3: Write Boundary Tests
Write test cases for the exact boundary values: 0.5, 0.2, 0.08, and 0. What does each one return? Is the current behavior what you would expect? If not, how would you change the comparisons?

<details>
<summary>Hint</summary>

- `classifySeverity(0.5)` returns `"sev2"` (not sev1, because `>` not `>=`)
- `classifySeverity(0.2)` returns `"sev3"`
- `classifySeverity(0.08)` returns `"sev4"`
- `classifySeverity(0)` returns `"sev4"`

Whether the boundaries should use `>` or `>=` depends on your incident management policy.
</details>

## Further Reading

- **Incident management frameworks** -- Look into PagerDuty's incident response documentation. They have excellent public resources on severity levels and response processes.
- **Guard clauses** -- The early return pattern used here is a specific form of guard clause. Search for "guard clause refactoring" to see how it improves code readability.
- **Decision tables** -- For more complex classification logic (multiple inputs, many outcomes), decision tables are a formal way to organize the rules. Worth knowing about as systems grow.
- **Input validation strategies** -- TypeScript's type system catches many bugs at compile time, but runtime validation (like checking for NaN or out-of-range values) is still necessary for data that comes from external sources.
