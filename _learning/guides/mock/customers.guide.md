# Guide: Mock Customer Data

**Source file:** `src/lib/mock/customers.ts`

---

## Purpose

This file provides a small, hardcoded set of fake customer data for building and testing the UI before the database is connected. It also defines TypeScript types that describe the shape of a customer object.

In early development, you often build the frontend first and wire it up to real data later. Mock data lets you do that. You can build a customer table component, see how it looks with different plan types and statuses, test edge cases (like a customer with $0 MRR), and iterate on the design -- all without touching a database.

This file serves a second purpose too: it acts as a **contract**. The types defined here (`CustomerStatus`, `CustomerPlan`, `Region`, `MockCustomer`) tell the rest of the codebase exactly what fields a customer has and what values those fields can take. Even after the real database is connected, these types remain useful as a reference for the data shape.

---

## Line-by-Line Walkthrough

```typescript
export type CustomerStatus = "active" | "suspended" | "churned";
```

This is a **union type**. It says: a `CustomerStatus` is a string, but not just any string -- it can only be `"active"`, `"suspended"`, or `"churned"`. If you try to assign `"deleted"` to a variable typed as `CustomerStatus`, TypeScript will give you a compile-time error.

Notice these values match the `customerStatusEnum` in the database schema (`src/lib/db/schema.ts`). That is intentional -- the mock data should mirror the real data shape.

```typescript
export type CustomerPlan = "free" | "starter" | "business" | "enterprise";
```

Same pattern. These four plans represent the pricing tiers of the product. They match `planEnum` in the schema.

```typescript
export type Region = "us-east" | "us-west" | "eu-west" | "ap-south";
```

Geographic regions where customers are deployed. Again, matches `regionEnum` in the schema.

```typescript
export type MockCustomer = {
  id: string;
  companyName: string;
  plan: CustomerPlan;
  status: CustomerStatus;
  region: Region;
  mrr: number;
  churnRiskScore: number;
  healthScore: number;
};
```

This is the **object type** that describes a customer. Let's look at each field:

- **`id: string`** -- A unique identifier. In the mock data, these are simple strings like `"cus_001"`. In the real database, they are UUIDs. Using a `string` type works for both cases.

- **`companyName: string`** -- The customer's company name. Free-form text.

- **`plan: CustomerPlan`** -- Which pricing tier the customer is on. By using the `CustomerPlan` type instead of plain `string`, any component that renders this field knows exactly which values to expect. You can write a switch statement on `plan` and TypeScript will warn you if you forget a case.

- **`status: CustomerStatus`** -- Whether the customer is active, suspended, or churned.

- **`region: Region`** -- Where the customer is deployed.

- **`mrr: number`** -- Monthly Recurring Revenue, in dollars. This is a key SaaS metric. Notice it is a `number` here but `numeric` (a string-like high-precision type) in the database schema. That is a pragmatic choice -- `number` is easier to work with in TypeScript for display and math, and mock data does not need the precision that financial calculations require.

- **`churnRiskScore: number`** -- A number from 0 to 1 representing how likely the customer is to cancel. 0 means no risk, 1 means they are almost certainly leaving. This is the kind of score that might come from a machine learning model in a real system.

- **`healthScore: number`** -- A number from 0 to 1 representing the customer's overall health (API usage, support tickets, feature adoption, etc.). Higher is better.

```typescript
export const mockCustomers: MockCustomer[] = [
```

An array of `MockCustomer` objects, explicitly typed. The `: MockCustomer[]` annotation means TypeScript will enforce that every object in this array has all the required fields with the correct types.

Now let's look at the actual data. Each entry was chosen to represent a different scenario:

```typescript
  {
    id: "cus_001",
    companyName: "Acme Telecom Labs",
    plan: "enterprise",
    status: "active",
    region: "us-east",
    mrr: 4200,
    churnRiskScore: 0.11,
    healthScore: 0.92,
  },
```

**The healthy enterprise customer.** High MRR ($4,200/month), low churn risk (0.11), high health score (0.92). This is your "ideal customer" case.

```typescript
  {
    id: "cus_002",
    companyName: "Northwind Retail Cloud",
    plan: "business",
    status: "active",
    region: "us-west",
    mrr: 390,
    churnRiskScore: 0.27,
    healthScore: 0.71,
  },
```

**The mid-tier customer.** Business plan, moderate MRR, moderate health. This is your "average" case.

```typescript
  {
    id: "cus_003",
    companyName: "Helio Health Systems",
    plan: "starter",
    status: "suspended",
    region: "eu-west",
    mrr: 79,
    churnRiskScore: 0.81,
    healthScore: 0.39,
  },
```

**The at-risk customer.** Suspended status, high churn risk (0.81), low health score (0.39), low MRR. This is important for testing how your UI displays warning states -- does the row turn red? Does a badge show "suspended"?

```typescript
  {
    id: "cus_004",
    companyName: "Orbit Education Group",
    plan: "free",
    status: "active",
    region: "ap-south",
    mrr: 0,
    churnRiskScore: 0.43,
    healthScore: 0.61,
  },
```

**The free-tier edge case.** MRR is exactly 0. This tests whether your formatting code handles $0 correctly (does it show "$0" or "$0.00" or just "--"?). The `ap-south` region also tests whether the UI handles all four regions.

```typescript
  {
    id: "cus_005",
    companyName: "Pioneer Payments Co",
    plan: "enterprise",
    status: "active",
    region: "us-east",
    mrr: 3180,
    churnRiskScore: 0.18,
    healthScore: 0.89,
  },
```

**A second enterprise customer.** Having two enterprise customers lets you test sorting and filtering -- when you filter by "enterprise", do both show up?

---

## Concepts Taught

| Concept | Where it appears |
|---|---|
| **Union types** | `"active" \| "suspended" \| "churned"` -- restricting a string to specific values |
| **Object types** | `MockCustomer` -- defining the shape of a data object |
| **Mock data strategy** | Each entry represents a distinct edge case (healthy, at-risk, free tier, etc.) |
| **Type-safe arrays** | `MockCustomer[]` -- ensuring every array element matches the type |
| **SaaS domain modeling** | MRR, churn risk, health scores, plans, regions |
| **Type vs. interface** | This file uses `type` for everything. In this case, `type` and `interface` would work identically. `type` is preferred when you want union types or do not need declaration merging. |

---

## Common Mistakes

1. **Not enough variety in mock data.** If all five customers were "active" / "enterprise" / "us-east", you would never catch UI bugs for other states. Good mock data covers every variant of every enum at least once. Notice this file covers all four plans, two of three statuses (missing "churned" -- that is a gap worth fixing), and three of four regions.

2. **Using `string` where a union type would be better.** If `plan` were typed as `string`, nothing would stop you from accidentally writing `plan: "premum"` (a typo). The union type catches that at compile time.

3. **Mismatched types between mock and real data.** If the mock uses `mrr: number` but the real database returns `mrr: string` (because `numeric` columns come back as strings in PostgreSQL), you will get runtime bugs when you swap from mock to real data. Be aware of this mismatch and handle the conversion at the data layer.

4. **Hardcoding mock data in components.** Components should receive data through props, not import mock data directly. The mock data should be injected at a higher level (a page, a layout, or a data-fetching function) so that swapping to real data later only requires changing one place.

5. **Forgetting to update mock data when the schema changes.** If someone adds a `contractEndDate` field to the customers table, the mock data needs to be updated too, or the types will drift apart and stop being useful as a contract.

---

## Mini Exercises

### Exercise 1: Add the Missing Status

The mock data covers "active" and "suspended" but not "churned". Add a sixth customer with `status: "churned"`. Think about what the other fields should look like for a churned customer (hint: MRR is probably 0, churn risk is irrelevant, health score is low).

### Exercise 2: Write a Filter Function

Write a function called `getCustomersByPlan` that takes a `CustomerPlan` parameter and returns only the customers on that plan:

```typescript
export function getCustomersByPlan(plan: CustomerPlan): MockCustomer[] {
  return mockCustomers.filter((c) => c.plan === plan);
}
```

Then try calling it with `getCustomersByPlan("enterprise")` and verify it returns two customers. Notice how TypeScript prevents you from calling `getCustomersByPlan("gold")` -- there is no "gold" plan.

### Exercise 3: Compute Total MRR

Write a function that computes the total MRR across all active customers. Use `.filter()` and `.reduce()`:

```typescript
export function totalActiveMrr(): number {
  return mockCustomers
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + c.mrr, 0);
}
```

What number do you expect? Add up the MRR for cus_001, cus_002, cus_004, and cus_005 (the active ones). Does your function return that number?

---

## Further Reading

- **TypeScript union types:** The [TypeScript handbook on union types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) explains how and when to use them.
- **Type vs. interface:** Search for "TypeScript type vs interface" for a deeper comparison. The short version: `type` is more flexible (unions, intersections, mapped types), `interface` is better for object shapes that might be extended. For this use case, either works.
- **SaaS metrics (MRR, churn, etc.):** If the business terms are unfamiliar, look up "SaaS metrics for developers." Understanding MRR, churn rate, and customer health scores will help you understand what the dashboard is trying to show.
- **Testing with mock data:** Look into "test fixtures" and "factory functions" for more sophisticated approaches to generating test data. Libraries like `fishery` or `factory.ts` let you create customer objects with sensible defaults while overriding specific fields for each test.
