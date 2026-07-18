# Guide: Simulators Overview

**Files:**
- `src/lib/simulators/incident-generator.ts`
- `src/lib/simulators/health-simulator.ts`
- `src/lib/simulators/usage-generator.ts`

## Purpose

Simulators generate fake but realistic data so you can develop and test your application without relying on real production events.

Think about it: how do you build an incident management dashboard if no incidents are happening? How do you test your usage analytics page if there are no customers generating usage data? How do you verify your health monitoring works if all services are healthy?

You cannot wait for real problems to occur just to test your code. Simulators solve this by creating synthetic data that looks and behaves like real data. They are development tools -- you run them during development and testing, but they do not run in production (production has real data).

This guide covers three scaffolded simulators. Each one is currently a stub that returns a timestamp, but we will discuss what fully implemented versions would do.

## The Code

### incident-generator.ts

```typescript
export async function runIncidentGenerator() {
  return { checkedAt: new Date().toISOString() };
}
```

### health-simulator.ts

```typescript
export async function runHealthSimulator() {
  return { simulatedAt: new Date().toISOString() };
}
```

### usage-generator.ts

```typescript
export async function runUsageGenerator() {
  return { generatedAt: new Date().toISOString() };
}
```

## Line-by-Line Walkthrough

All three files follow the same pattern, so we can analyze them together.

### `export async function run[SimulatorName]() {`

- `async` -- simulators interact with databases, APIs, or at minimum use timers and delays. The real implementations are inherently asynchronous.
- The `run` prefix indicates these are *executable* functions, not data definitions or utilities. You "run" a simulator.
- Each function takes no parameters. A real implementation would accept configuration: how much data to generate, what time range to cover, how realistic to make it, etc.

### `return { [timestamp field]: new Date().toISOString() };`

Each stub returns a slightly different field name:
- `checkedAt` -- the incident generator "checked" for conditions that might trigger an incident.
- `simulatedAt` -- the health simulator "simulated" health data.
- `generatedAt` -- the usage generator "generated" usage records.

The field names hint at what each simulator does, even in stub form. `new Date().toISOString()` produces a timestamp like `"2025-06-15T14:30:00.000Z"` -- standardized, timezone-aware, sortable, and universally parseable.

## What Fully Implemented Simulators Would Do

### Incident Generator

A real incident generator would:

1. **Create realistic incidents at random intervals.** Not constant intervals -- real incidents are unpredictable. You might use a Poisson distribution to model arrival times.
2. **Vary severity levels.** Most incidents are sev3 or sev4 (minor). sev1 incidents are rare. The generator should reflect this distribution.
3. **Simulate incident lifecycle.** A generated incident would progress through states: declared, investigating, mitigating, resolved. Each transition would happen after a realistic delay.
4. **Affect realistic services and regions.** The incidents would reference actual services and regions defined elsewhere in your system, not random strings.
5. **Generate correlated data.** An incident might trigger alerts, change health statuses, and create audit log entries -- all of which should be connected.

Example of what a real implementation might look like:

```typescript
export async function runIncidentGenerator(config: {
  intervalMs: number;
  severityDistribution: Record<string, number>;
}) {
  const severity = weightedRandom(config.severityDistribution);
  const service = randomFrom(["auth", "billing", "search", "payments"]);
  const region = randomFrom(["us-east", "us-west", "eu-west"]);

  await createIncident(`Elevated errors in ${service} (${region})`);
  // ... more steps
}
```

### Health Simulator

A real health simulator would:

1. **Generate health metrics for each service.** CPU usage, memory, response time, error rate, throughput -- the metrics that operations teams monitor.
2. **Model realistic patterns.** Traffic follows a daily cycle (low at night, high during business hours). Health metrics correlate with traffic. A sudden spike in response time after a deploy is realistic; a random spike at 3am might indicate a different kind of problem.
3. **Simulate degradation scenarios.** Gradually increase error rates to trigger alerts. Simulate a memory leak (slowly increasing memory usage). Model a cascading failure where one service's problems cause downstream services to degrade.
4. **Write data to the same stores the real application uses.** The dashboard code should not know or care whether the data came from a simulator or real monitoring.

### Usage Generator

A real usage generator would:

1. **Create customer usage records.** API calls, storage consumed, compute hours used -- whatever your product charges for.
2. **Model realistic usage patterns.** Enterprise customers use more than startups. Usage grows over time. There are daily and weekly patterns.
3. **Generate billing-relevant data.** If the application has billing features, the usage data should produce realistic invoices.
4. **Create enough volume to stress-test.** Generate thousands or millions of records to verify your queries and UI perform well at scale, not just with 5 test records.

## Why Simulators Matter

### 1. They Make Development Possible

Without simulators, you are developing blind. Your dashboards show "No data." Your lists are empty. Your charts have no lines. You cannot tell whether your code works because there is nothing to display.

### 2. They Catch UI Edge Cases

Real data is messy. Incident titles can be 200 characters long. Service names can have special characters. Usage numbers can be zero, or billions. Simulators that generate diverse, realistic data expose edge cases you would miss with manually created test data.

### 3. They Enable Demo Environments

When you want to demo the product to stakeholders or customers, you need data. Simulators fill a demo environment with realistic-looking data in minutes.

### 4. They Support Automated Testing

Integration tests and end-to-end tests need data. Simulators can seed a test database before each test run, giving you a consistent starting point.

### 5. They Are Cheaper Than Staging Environments

Running a full staging environment with real data is expensive and raises data privacy concerns. Simulators generate synthetic data that looks real but contains no actual customer information.

## Honesty About Code Quality

These are the thinnest stubs in the codebase. Each one is a single function that returns a timestamp. The gap between what exists and what a real simulator would do is enormous.

That said:
- **The file structure is right.** Each simulator is in its own file, with a clear name and a single exported function.
- **The async signatures are right.** Real simulators will be async.
- **The return values hint at the function's role.** Even the stub communicates something about its purpose.

The biggest risk with stubs this thin is that they get forgotten. Someone should create tickets or TODO comments for implementing the real versions. An empty simulator that silently does nothing is worse than a missing simulator that loudly errors.

## Concepts Taught

1. **Synthetic data generation** -- Creating fake data that mimics production data. This is a skill that spans development, testing, and data science. Good synthetic data is realistic, diverse, and private (contains no real user information).

2. **Development tooling vs. production code** -- Simulators are development tools. They exist to make developers' lives easier, not to serve end users. Knowing the difference between development-only code and production code is important for architecture decisions (where do simulators live? how are they triggered? are they deployed?).

3. **The `.toISOString()` pattern** -- ISO 8601 is the standard timestamp format for APIs and logs. `"2025-06-15T14:30:00.000Z"` is unambiguous: it includes the date, time, milliseconds, and timezone (Z means UTC). Always use ISO format for machine-readable timestamps.

4. **Module organization** -- Three related files in a `simulators/` directory, each with a clear name and a single responsibility. This is how you organize code when you have multiple related but independent pieces.

5. **Scaffolding for parallel development** -- These stubs let the UI team build dashboard components while the backend team works on data generation. Neither blocks the other. This is a practical example of how stubs enable parallel work.

## Common Mistakes

1. **Making simulators too random** -- If every value is randomly generated, the data looks like noise. Real data has patterns (daily cycles, correlations between metrics, distributions that favor certain values). Good simulators model these patterns.

2. **Not cleaning up simulated data** -- If simulators write to a shared database, they can pollute it. Use a separate database for simulated data, or tag simulated records so they can be identified and cleaned up.

3. **Forgetting to disable simulators in production** -- A simulator accidentally running in production would create fake incidents and confuse everyone. Use environment checks to prevent this.

4. **Generating too little data** -- Five fake records will not stress-test your pagination, your search, or your chart rendering. Generate enough to be realistic: hundreds of incidents, thousands of usage records, millions if you want to test performance.

5. **Not seeding random number generators** -- If your simulator uses `Math.random()`, you get different data every run. For reproducible testing, use a seeded random number generator so you can regenerate the exact same dataset.

## Mini Exercises

### Exercise 1: Implement a Basic Incident Generator
Write a version of `runIncidentGenerator` that creates 5 fake incidents using the `createIncident` function from `src/lib/incidents/service.ts`. Give each a realistic title. Return the array of created incidents.

<details>
<summary>Hint</summary>

```typescript
import { createIncident } from "@/lib/incidents/service";

export async function runIncidentGenerator() {
  const titles = [
    "Elevated error rates on payments API",
    "Database connection pool exhaustion in us-east",
    "Certificate expiration warning for auth service",
    "Memory leak detected in search indexer",
    "Latency spike on customer dashboard",
  ];

  const incidents = await Promise.all(titles.map(title => createIncident(title)));
  return { checkedAt: new Date().toISOString(), incidents };
}
```

`Promise.all` runs all the `createIncident` calls concurrently and waits for all of them to finish.
</details>

### Exercise 2: Add Configuration
Modify `runUsageGenerator` to accept a `count: number` parameter (defaulting to 10) and return an array of that many fake usage records. Each record should have a `customerId`, `apiCalls` (random number 0-10000), and `timestamp`.

<details>
<summary>Hint</summary>

```typescript
export async function runUsageGenerator(count = 10) {
  const records = Array.from({ length: count }, (_, i) => ({
    customerId: `cust_${i + 1}`,
    apiCalls: Math.floor(Math.random() * 10000),
    timestamp: new Date().toISOString(),
  }));

  return { generatedAt: new Date().toISOString(), records };
}
```

`Array.from({ length: count }, callback)` creates an array of the given length using the callback to generate each element.
</details>

### Exercise 3: Add an Environment Check
Wrap one of the simulators with a guard that throws an error if `process.env.NODE_ENV === "production"`. This prevents accidental use in production. Think about whether this check should be in the simulator itself or in the code that calls it.

<details>
<summary>Hint</summary>

```typescript
export async function runHealthSimulator() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Simulators must not run in production");
  }

  return { simulatedAt: new Date().toISOString() };
}
```

Putting the check in the simulator itself is the safest approach -- it is a last line of defense even if the caller forgets to check. But ideally, the caller also checks, so you never even attempt to call the simulator in production.
</details>

## Further Reading

- **Faker.js** -- A popular library for generating realistic fake data (names, addresses, emails, company names, etc.). It is the standard tool for data generation in JavaScript projects.
- **Seed data and database seeding** -- The practice of populating a database with initial data for development or testing. Most web frameworks have a "seed" command or script.
- **Statistical distributions** -- Understanding normal distribution, Poisson distribution, and power-law distribution will help you generate more realistic synthetic data. Real-world data rarely follows a uniform distribution.
- **Chaos engineering** -- The practice of deliberately introducing failures into a system to test its resilience. Netflix's Chaos Monkey is the most famous example. Simulators that generate incidents are a lighter version of this concept.
- **Test fixtures** -- Predefined data used in tests. Simulators are dynamic fixtures -- they generate data on the fly rather than using hardcoded datasets. Learn about both approaches and when to use which.
