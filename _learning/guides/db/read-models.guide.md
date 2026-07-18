# Guide: Read Models (Materialized View Stubs)

**Source files:**
- `src/lib/db/read-models/customer-summary.ts`
- `src/lib/db/read-models/billing-summary.ts`
- `src/lib/db/read-models/infrastructure-health.ts`

---

## Purpose

These three files are stubs for **read models** -- pre-computed, query-optimized views of your data. Right now, each file contains a single function that returns a placeholder object. The real implementations will eventually run expensive SQL queries to aggregate data and cache the results.

Before we look at the code, let's understand the problem read models solve.

### The Problem: Expensive Queries

Imagine a dashboard that shows "total MRR by plan by region" for all 45,000 customers. To compute that, you would need to:

1. Scan every row in the `customers` table.
2. Group by `plan` and `region`.
3. Sum the `mrr` column for each group.

This query might take 500ms on a large dataset. If 50 people load the dashboard at the same time, your database runs that same expensive query 50 times, which slows everything down.

### The Solution: Pre-Compute and Cache

A **read model** (sometimes called a **materialized view**) is a pre-computed summary that you refresh periodically (say, every 5 minutes). Instead of running the expensive query for every request, you:

1. Run the expensive query once and store the result in a summary table (or PostgreSQL materialized view).
2. Serve dashboard requests from the summary table, which is a fast, simple `SELECT *`.
3. Refresh the summary on a schedule.

The tradeoff is that your dashboard data might be up to 5 minutes stale, but the response time drops from 500ms to 5ms. For most dashboards, this tradeoff is absolutely worth it.

---

## Code Walkthrough

All three files follow the exact same pattern. Here is the customer summary version:

```typescript
export async function refreshCustomerSummaryReadModel() {
  return { refreshedAt: new Date().toISOString(), readModel: "customer_summary_mv" };
}
```

And the other two:

```typescript
// billing-summary.ts
export async function refreshBillingSummaryReadModel() {
  return { refreshedAt: new Date().toISOString(), readModel: "billing_summary_mv" };
}

// infrastructure-health.ts
export async function refreshInfrastructureHealthReadModel() {
  return { refreshedAt: new Date().toISOString(), readModel: "infrastructure_health_mv" };
}
```

Let's break down the pattern:

**`export async function refreshCustomerSummaryReadModel()`**

The function is `async` because the real implementation will run database queries (which are asynchronous). It is exported so other parts of the app -- like a cron job, a background worker, or an admin API endpoint -- can trigger a refresh.

The naming convention `refresh___ReadModel` makes the intent clear: calling this function recomputes the read model. It does not fetch data for the UI -- it rebuilds the cached summary.

**`return { refreshedAt: new Date().toISOString(), readModel: "customer_summary_mv" }`**

This return value is a placeholder that confirms the function ran. `new Date().toISOString()` gives you the current time in ISO 8601 format (like `"2026-02-24T14:30:00.000Z"`). The `readModel` string identifies which materialized view this function is responsible for.

The `_mv` suffix in `"customer_summary_mv"` stands for "materialized view" -- a naming convention from PostgreSQL. In a real implementation, this might correspond to an actual PostgreSQL materialized view created with `CREATE MATERIALIZED VIEW customer_summary_mv AS SELECT ...`.

### Why Three Separate Files?

Each read model summarizes a different domain:

- **customer-summary**: Aggregated customer metrics (total counts by plan, average MRR, churn risk distribution, etc.).
- **billing-summary**: Invoice totals, revenue breakdowns, outstanding amounts, credit adjustments.
- **infrastructure-health**: Latest latency, error rates, and status across services and regions.

Keeping them in separate files follows the **single responsibility principle** -- each file handles one domain. When the billing summary logic needs to change, you only touch `billing-summary.ts`, without risking a change to the customer or infrastructure logic.

---

## Concepts Taught

| Concept | Where it appears |
|---|---|
| **Read models / materialized views** | The entire pattern -- pre-computing expensive queries |
| **CQRS lite** | Separating read-optimized views from the write-path tables |
| **Stub / placeholder pattern** | Functions that return dummy data until the real implementation is ready |
| **Single responsibility** | One file per domain (customers, billing, infrastructure) |
| **Async function signatures** | `async` even though the current code is synchronous, preparing for the real implementation |
| **ISO 8601 timestamps** | `new Date().toISOString()` -- the standard format for machine-readable dates |

### A Note on CQRS

These read model files are a lightweight version of a pattern called **CQRS** (Command Query Responsibility Segregation). The full CQRS pattern separates "writing data" and "reading data" into completely different models. This project is not doing full CQRS, but the idea is the same: the tables in `schema.ts` are optimized for writing (normalized, foreign keys, constraints), while these read models would be optimized for reading (denormalized, pre-aggregated, fast).

You do not need to understand the full CQRS pattern yet. Just remember: sometimes the best way to structure data for writing is different from the best way to structure it for reading, and read models bridge that gap.

---

## Common Mistakes

1. **Refreshing too often.** If you refresh a materialized view every second, you lose the performance benefit because you are constantly running the expensive query. Most dashboards are fine with 1-5 minute staleness. Pick a refresh interval that matches how fresh the data actually needs to be.

2. **Refreshing synchronously in the request path.** If a user hits the dashboard and your code refreshes the materialized view before responding, you have made the response slow. Refreshes should happen in the background -- on a schedule (cron job) or triggered by a background worker. The request handler should only read from the pre-computed summary.

3. **Not handling the "cold start" case.** When the app first starts, the materialized view might be empty (no data has been computed yet). The UI should handle this gracefully -- maybe show a "data is loading" message -- rather than crashing or showing a blank page.

4. **Forgetting to add indexes to the materialized view.** In PostgreSQL, creating a materialized view gives you a table-like structure, but it has no indexes by default. You need to manually `CREATE INDEX` on it, just like any other table. Without indexes, even your pre-computed view might be slow.

5. **Confusing read models with caches.** A Redis cache stores raw query results temporarily. A read model restructures and aggregates data into a different shape. They solve similar problems (avoiding repeated expensive work), but a read model is typically more thought-out and permanent.

---

## Mini Exercises

### Exercise 1: Sketch Out the Customer Summary Query

Without writing real code, write out in comments (or pseudocode) what the `refreshCustomerSummaryReadModel` function would eventually need to compute. Think about what a dashboard would want to know about customers:

- Total customers by plan (`free`, `starter`, `business`, `enterprise`)
- Total customers by status (`active`, `suspended`, `churned`)
- Average MRR
- Number of customers with churn risk score above 0.7

### Exercise 2: Add a Refresh Timestamp Check

Modify one of the functions to accept an optional `lastRefreshedAt: Date` parameter. If the last refresh was less than 5 minutes ago, return early without recomputing. This simulates a debounce mechanism that prevents wasteful re-computation.

```typescript
export async function refreshCustomerSummaryReadModel(lastRefreshedAt?: Date) {
  if (lastRefreshedAt) {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (lastRefreshedAt.getTime() > fiveMinutesAgo) {
      return { refreshedAt: lastRefreshedAt.toISOString(), readModel: "customer_summary_mv", skipped: true };
    }
  }
  // ... actual refresh logic would go here
  return { refreshedAt: new Date().toISOString(), readModel: "customer_summary_mv", skipped: false };
}
```

### Exercise 3: Create a Refresh-All Function

Create a new file `src/lib/db/read-models/refresh-all.ts` that imports all three refresh functions and calls them in parallel using `Promise.all()`. Return an array of all three results. This is the kind of function a cron job would call every few minutes.

---

## Further Reading

- **PostgreSQL materialized views:** The [PostgreSQL docs on CREATE MATERIALIZED VIEW](https://www.postgresql.org/docs/current/sql-creatematerializedview.html) explain the database-level feature these stubs are modeling.
- **CQRS pattern:** Martin Fowler has a good overview at [martinfowler.com/bliki/CQRS.html](https://martinfowler.com/bliki/CQRS.html). Do not worry about understanding every detail -- just read it for the big picture.
- **Drizzle raw SQL:** When the real implementations are built, they will likely use `db.execute(sql\`...\`)` from Drizzle for the complex aggregation queries. See the [Drizzle SQL docs](https://orm.drizzle.team/docs/sql).
- **Background jobs in Next.js:** Refreshing read models usually happens outside of HTTP requests. Look into tools like `node-cron`, Bull/BullMQ, or Vercel Cron Jobs for scheduling background work.
