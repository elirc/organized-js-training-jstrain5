# Guide: Incident Service

**File:** `src/lib/incidents/service.ts`

## Purpose

This file handles creating incident records. When something goes wrong in production, someone (or an automated system) "declares" an incident. This function creates the data structure that represents that incident.

An incident is a formal acknowledgment that something is broken and needs attention. Declaring one starts the clock on response time, creates a central record for communication, and triggers downstream processes like notifications, severity assessment, and runbook execution.

This is another scaffold that returns a mock object instead of persisting to a real database.

## The Code

```typescript
export async function createIncident(title: string) {
  return { id: `inc_${Date.now()}`, title, status: "declared" as const };
}
```

## Line-by-Line Walkthrough

### `export async function createIncident(title: string) {`

- `async` because the real implementation will write to a database.
- `title: string` -- a human-readable description of what is happening, like "Payment processing failures in us-east-1" or "Elevated latency on search API."

### `return { id: \`inc_${Date.now()}\`, title, status: "declared" as const };`

Let's break down each field:

- **`id: \`inc_${Date.now()}\``** -- Generates a unique-ish identifier using a template literal. `Date.now()` returns the current timestamp in milliseconds (e.g., `1706547200000`), so you get IDs like `"inc_1706547200000"`. The `inc_` prefix is a convention that makes it easy to identify what kind of entity an ID refers to when you see it in logs or URLs.

- **`title`** -- Shorthand for `title: title`. The incident's description, passed through from the parameter.

- **`status: "declared" as const`** -- The incident starts in "declared" status. Other statuses might be `"investigating"`, `"mitigating"`, `"resolved"`, `"closed"`. The `as const` ensures TypeScript knows this is specifically `"declared"` and not just any string.

## Honesty About Code Quality

- **`Date.now()` for IDs is not production-safe.** If two incidents are created in the same millisecond, they get the same ID. Production systems use UUIDs (like `crypto.randomUUID()`) or database-generated IDs. `Date.now()` is fine for scaffolding because collisions are extremely unlikely during development.

- **No required fields are enforced.** A real incident should probably require a severity level, a reporter, and an affected service at minimum. This function only takes a title.

- **No persistence.** The returned object exists only in memory. Once the calling code finishes, the incident is gone. A real implementation would insert a database row.

- **No event emission.** Creating an incident should trigger a chain of events: notify the on-call team, start a timeline, create a Slack channel, etc. This stub does none of that.

- **The `declared` status is a good design choice.** Using a specific initial status (not `"open"` or `"active"`) makes it clear that this is the very first state. A real incident state machine would have well-defined transitions between states.

## Concepts Taught

1. **Template literals for ID generation** -- The backtick syntax `` `inc_${Date.now()}` `` lets you embed expressions inside strings. This is used constantly in JavaScript/TypeScript. The prefix pattern (`inc_`, `usr_`, `ord_`) is common in production systems because it makes IDs self-describing.

2. **Entity prefixes** -- `inc_` tells you immediately that this ID belongs to an incident, not a user or an order. Stripe popularized this pattern (`cus_` for customers, `pi_` for payment intents, `sub_` for subscriptions). It is a small thing that makes debugging significantly easier.

3. **Status as a state machine** -- `"declared"` is the initial state. In a full implementation, you would define all valid states and the allowed transitions between them. For example, you can go from `"declared"` to `"investigating"` but not directly from `"declared"` to `"closed"` (you have to resolve it first). This is called a state machine.

4. **`Date.now()` vs `new Date()`** -- `Date.now()` returns a number (milliseconds since Unix epoch). `new Date()` returns a Date object. For generating IDs, the number is simpler. For displaying timestamps to humans, you want the Date object (and usually `.toISOString()` for a standard format).

## Common Mistakes

1. **Using `Date.now()` for IDs in production** -- It is not unique enough. Two requests in the same millisecond get the same ID. Use `crypto.randomUUID()` or a library like `nanoid` instead.

2. **Forgetting that template literals use backticks, not quotes** -- `` `inc_${Date.now()}` `` uses backticks. If you use single or double quotes, the `${}` interpolation does not work and you get the literal string `"inc_${Date.now()}"`.

3. **Not defining a state machine** -- It is tempting to use arbitrary strings for status (just set it to whatever feels right at the time). This leads to inconsistencies. Define your states upfront as a union type: `type IncidentStatus = "declared" | "investigating" | "mitigating" | "resolved"`.

4. **Returning mutable objects without thinking about it** -- The returned object can be modified by the caller: `incident.status = "anything"`. In TypeScript, you can prevent this with `as const` on the entire object or by using `Readonly<>` types. For now, this is a minor concern but worth being aware of.

## Mini Exercises

### Exercise 1: Use a UUID Instead
Replace `Date.now()` with `crypto.randomUUID()` (available in Node.js 19+ and all modern browsers). Run it a few times and observe the format of the generated IDs.

<details>
<summary>Hint</summary>

```typescript
return { id: `inc_${crypto.randomUUID()}`, title, status: "declared" as const };
```

You will get IDs like `"inc_a1b2c3d4-e5f6-7890-abcd-ef1234567890"`.
</details>

### Exercise 2: Add Required Fields
Expand the function to require `severity` (one of "sev1" through "sev4") and `reportedBy` (a string) as additional parameters. Include them in the returned object.

<details>
<summary>Hint</summary>

```typescript
type Severity = "sev1" | "sev2" | "sev3" | "sev4";

export async function createIncident(
  title: string,
  severity: Severity,
  reportedBy: string
) {
  return {
    id: `inc_${Date.now()}`,
    title,
    severity,
    reportedBy,
    status: "declared" as const,
    declaredAt: new Date().toISOString(),
  };
}
```

</details>

### Exercise 3: Define a Status Type
Create a `type IncidentStatus` union of all valid incident statuses. Then write a function `transitionStatus(current: IncidentStatus, next: IncidentStatus): boolean` that returns `true` only if the transition is valid (e.g., "declared" can go to "investigating" but not directly to "closed").

<details>
<summary>Hint</summary>

Define a map of allowed transitions:

```typescript
const validTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  declared: ["investigating"],
  investigating: ["mitigating", "resolved"],
  mitigating: ["resolved"],
  resolved: ["closed"],
  closed: [],
};

function transitionStatus(current: IncidentStatus, next: IncidentStatus): boolean {
  return validTransitions[current].includes(next);
}
```

</details>

## Further Reading

- **UUID generation** -- Learn about UUIDv4 (random) vs UUIDv7 (time-ordered). UUIDv7 is particularly useful for database primary keys because it is both unique and sortable.
- **State machines** -- XState is a popular TypeScript library for modeling state machines. Understanding state machines will help you design any system that has "statuses" or "phases."
- **Incident management** -- Read about the Incident Command System (ICS). Tech companies borrowed this framework from emergency services. PagerDuty and Atlassian have good public documentation.
- **Entity ID design** -- Stripe's API design guide discusses why prefixed IDs (`cus_`, `pi_`, etc.) are useful. This is a surprisingly impactful design decision.
