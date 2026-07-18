# Guide: Mock Dashboard Data

**Source file:** `src/lib/mock/dashboard.ts`

---

## Purpose

This file provides hardcoded data for the main dashboard view. It defines two arrays: one for KPI cards (the big numbers at the top of a dashboard) and one for a system health table. Like the customer mock data, this exists so you can build and style the dashboard UI without needing a live database or real metrics pipeline.

This file also serves as an implicit **specification**. By reading the mock data, you can understand exactly what the dashboard is supposed to show, what shape each data point takes, and what kind of information operators care about. If you were a new developer onboarding to this project, this file would tell you a lot about what the product does.

---

## Line-by-Line Walkthrough

### KPI Cards

```typescript
export const dashboardKpis = [
```

An array of objects, each representing one KPI (Key Performance Indicator) card on the dashboard.

```typescript
  { label: "Active Customers", value: "44,983", trend: "+0.8% vs 7d" },
```

Each object has three fields:

- **`label`** -- What the metric is called. This is what appears as the card title.
- **`value`** -- The metric's current value, as a pre-formatted string. Notice it is `"44,983"` (a string with a comma), not `44983` (a number). This is a deliberate design choice -- the value is already formatted for display. The component that renders this just drops it into the UI without needing to know how to format numbers.
- **`trend`** -- Contextual information about the direction. Is it going up? Down? Compared to what time period? This gives the operator at-a-glance context.

Let's look at what each KPI tells us about the product:

```typescript
  { label: "Active Customers", value: "44,983", trend: "+0.8% vs 7d" },
```

Nearly 45,000 active customers, growing slowly. This is a mature SaaS product, not an early-stage startup.

```typescript
  { label: "MRR", value: "$6.92M", trend: "+1.7% vs 30d" },
```

Monthly Recurring Revenue of almost $7 million. The 30-day comparison window makes sense for revenue (weekly fluctuations are noisy for financial metrics).

```typescript
  { label: "API Calls Today", value: "1.84M", trend: "-2.1% vs yesterday" },
```

This tells us the product exposes APIs that customers call. 1.84 million calls per day is significant traffic. The slight dip from yesterday is probably normal variation.

```typescript
  { label: "Error Rate (5m)", value: "0.42%", trend: "Within SLO" },
```

The 5-minute error rate. "SLO" stands for Service Level Objective -- a target the team has set (something like "error rate must stay below 1%"). The trend text "Within SLO" is not a percentage comparison; it is a qualitative status. This is a good example of how the `trend` field is flexible -- it does not have to be a percentage.

```typescript
  { label: "Active Incidents", value: "2", trend: "1 SEV2, 1 SEV3" },
```

Two ongoing incidents. The trend field breaks them down by severity. SEV2 is moderately serious, SEV3 is less so. An operator seeing this knows the situation is not great but not catastrophic (no SEV1).

```typescript
  { label: "Pending Approvals", value: "5", trend: "2 expire < 6h" },
```

Five operations waiting for someone to approve them, with two that expire soon. This creates urgency -- someone needs to review those before the 6-hour deadline.

```typescript
  { label: "Operations Today", value: "113", trend: "8 running now" },
```

113 operations have been executed today, with 8 currently in progress. This tells you the ops team is active and the system handles a meaningful volume of operations.

```typescript
  { label: "High Churn Risk", value: "4,982", trend: "11.1% of active accounts" },
```

Almost 5,000 customers are flagged as high churn risk, about 11% of the total. This is a concerning number and probably drives a lot of the product's customer success workflows.

```typescript
] as const;
```

`as const` is a TypeScript feature called a **const assertion**. It does two things:

1. Makes the entire array and all nested objects `readonly`. You cannot push new items to the array or change a value.
2. Narrows the types. Without `as const`, TypeScript infers `label` as `string`. With `as const`, it infers `label` as the literal type `"Active Customers"` (for the first item). This enables better type checking downstream.

The `as const` is appropriate here because mock data should never be mutated at runtime. It is reference data.

### System Health Table

```typescript
export const systemHealthRows = [
  { service: "Voice API", region: "us-east", latencyP95: 118, errorRate: 0.38, status: "operational" },
```

This array represents rows in a system health monitoring table. Each row describes one service in one region. The fields:

- **`service`** -- The name of the microservice or API.
- **`region`** -- Where this instance runs. Same regions as the customer data.
- **`latencyP95`** -- The 95th percentile latency in milliseconds. This means 95% of requests complete in 118ms or less. P95 is a standard metric in operations because it captures the "slow tail" better than averages. An average of 50ms sounds great, but if 5% of requests take 2 seconds, users notice.
- **`errorRate`** -- Percentage of requests that fail. 0.38% is healthy. Anything above 1% is usually a concern.
- **`status`** -- The operational status of the service.

Now let's look at each row and what it represents:

```typescript
  { service: "Voice API", region: "us-east", latencyP95: 118, errorRate: 0.38, status: "operational" },
```

Healthy. Low latency, low error rate, operational. The "green" row.

```typescript
  { service: "SMS Gateway", region: "eu-west", latencyP95: 241, errorRate: 1.22, status: "degraded" },
```

Degraded. Latency is higher (241ms), error rate is above 1%, status is "degraded". This is the "yellow" row -- not down, but not healthy either. A good test case for UI warning styles.

```typescript
  { service: "Billing Service", region: "us-west", latencyP95: 134, errorRate: 0.29, status: "operational" },
```

Another healthy service. Having two "operational" rows ensures the UI doesn't just work for one.

```typescript
  { service: "Data Pipeline", region: "ap-south", latencyP95: 387, errorRate: 3.84, status: "investigating" },
```

This is the "red" row. Latency is nearly 400ms, error rate is 3.84% (very high), and the status is "investigating" -- meaning someone is actively looking into it. This tests how the UI renders the worst case.

```typescript
] as const;
```

Same `as const` treatment. The array is read-only and the types are narrowed to literal values.

---

## Concepts Taught

| Concept | Where it appears |
|---|---|
| **`as const` assertions** | Both arrays use `as const` for immutability and literal types |
| **Pre-formatted display values** | `value: "$6.92M"` -- the data layer decides how to format, the UI just renders |
| **KPI dashboard patterns** | Label + value + trend is a universal pattern for metric cards |
| **P95 latency** | `latencyP95` -- understanding percentile-based performance metrics |
| **SLO (Service Level Objectives)** | The "Within SLO" trend text references operational targets |
| **Status-driven UI** | `"operational"`, `"degraded"`, `"investigating"` -- driving visual states from data |
| **Domain variety in test data** | Each row represents a different health state for testing UI edge cases |

---

## Common Mistakes

1. **Using numbers for display values.** You might be tempted to change `value: "44,983"` to `value: 44983` so you can do math with it. But this mixes concerns. The mock data is for display, not computation. If you need to do math, use a separate numeric field. Pre-formatted strings keep the rendering logic out of your components.

2. **Mutating `as const` data.** If you try `dashboardKpis[0].value = "50,000"`, TypeScript will give you an error because `as const` makes everything `readonly`. This is a feature, not a bug. If you need to modify the data (for tests, for example), create a new array with the spread operator: `[...dashboardKpis.map(k => ({ ...k }))]`.

3. **Not handling all statuses in the UI.** If your component only styles "operational" and "degraded" but forgets "investigating", the Data Pipeline row will look unstyled or broken. When you build the UI, make sure you handle every possible status value. TypeScript's `as const` can help here -- if you write a switch statement and forget a case, the compiler can warn you (using exhaustive checking).

4. **Hardcoding column widths for specific values.** The mock says "44,983" but the real number might grow to "144,983" and break your layout. Always test with longer strings than your mock data provides.

5. **Treating P95 latency like average latency.** P95 = 118ms does not mean most requests take 118ms. It means 95% of requests are 118ms or faster. The median (P50) might be 40ms. When building the health dashboard, make sure your labels clearly say "P95" so operators do not misinterpret the number.

---

## Mini Exercises

### Exercise 1: Add a KPI Status Field

The current KPI objects have `label`, `value`, and `trend`. Add an optional `status` field that can be `"healthy"`, `"warning"`, or `"critical"`. Assign statuses based on the data:

- "Error Rate" with 0.42% "Within SLO" is `"healthy"`
- "Active Incidents" with 2 incidents is `"warning"`
- "High Churn Risk" at 11.1% might be `"critical"`

Then think about how a component would use this to pick a color (green, yellow, red).

### Exercise 2: Build a Type for the KPI Data

Right now, the KPI objects are untyped (TypeScript infers the types from `as const`). Write an explicit type:

```typescript
type DashboardKpi = {
  label: string;
  value: string;
  trend: string;
};
```

Then consider: should `label` be a union type of the specific labels, or just `string`? What are the tradeoffs? (Hint: a union type would prevent typos but make it harder to add new KPIs.)

### Exercise 3: Compute an Aggregate

Write a function that takes `systemHealthRows` and returns the worst (highest) error rate across all services. Use the spread operator with `Math.max`:

```typescript
function worstErrorRate(): number {
  return Math.max(...systemHealthRows.map((row) => row.errorRate));
}
```

What value do you expect? Which service has it?

---

## Further Reading

- **`as const` in TypeScript:** The [TypeScript docs on const assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types) explain how `as const` narrows types and enforces immutability.
- **P50 / P95 / P99 latency:** Search for "percentile latency explained" for a visual explanation of why percentiles matter more than averages for monitoring.
- **SLOs, SLIs, and SLAs:** Google's SRE book has a great chapter on these concepts. An SLO is a target you set for yourself, an SLI is the metric you measure, and an SLA is a contractual promise to customers.
- **Dashboard design patterns:** Search for "KPI dashboard best practices" for guidance on what makes a good dashboard. The label + value + trend pattern used here is a well-established convention.
- **Readonly types in TypeScript:** If you want to understand what `as const` does under the hood, read about `Readonly<T>` and `ReadonlyArray<T>` in the TypeScript handbook.
