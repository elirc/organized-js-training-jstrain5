# Guide: Customer Impact Estimation

**File:** `src/lib/incidents/impact.ts`

## Purpose

During an incident, one of the first questions leadership will ask is: "How many customers are affected?" This function provides a rough estimate.

The idea is simple: if a problem affects 3 regions and 4 services, and each region-service combination serves about 1,200 customers, then approximately 3 * 4 * 1,200 = 14,400 customers might be impacted.

This is a back-of-the-envelope calculation, not a precise count. In incident response, a rough fast number is more useful than a precise slow one. You need to communicate impact *now*, not after a 30-minute database query.

## The Code

```typescript
export function estimateCustomerImpact(regionCount: number, serviceCount: number) {
  return regionCount * serviceCount * 1200;
}
```

## Line-by-Line Walkthrough

### `export function estimateCustomerImpact(regionCount: number, serviceCount: number) {`

- Synchronous, pure function. Takes two numbers, returns a number. No side effects, no async.
- `regionCount` -- how many geographic regions are affected (e.g., us-east, eu-west, ap-south).
- `serviceCount` -- how many services within those regions are impacted (e.g., auth, billing, search).

### `return regionCount * serviceCount * 1200;`

- Multiplies the three values together. The 1,200 is a constant representing the estimated number of customers per region-service pair.
- This assumes uniform distribution -- every region and every service has roughly the same number of customers. That is rarely true in practice, but it gives you an order-of-magnitude estimate.

## Honesty About Code Quality

This function is extremely simple, and that simplicity is both its strength and its weakness.

- **The magic number 1200** -- Where does this come from? There is no comment explaining it. In a real codebase, this should at minimum have a comment, and ideally be a named constant or configuration value. Is it 1,200 customers per region? Per service? Per region-service pair? The code does not say.
- **Uniform distribution assumption** -- `us-east` probably has 10x more customers than `ap-south`. A real estimation function would use per-region customer counts from a database.
- **No input validation** -- Negative numbers or zero would produce nonsensical results.
- **No return type annotation** -- TypeScript infers `number`, which is fine, but `@returns` JSDoc explaining what the number *represents* (estimated customer count) would help.
- **The name says "estimate" which is good** -- Using "estimate" instead of "count" or "calculate" sets correct expectations about precision.

Despite these issues, having *any* impact estimation function is better than having none. During an incident, this kind of quick calculation helps teams prioritize.

## Concepts Taught

1. **Estimation over precision** -- In production systems, especially during incidents, speed of information matters more than perfect accuracy. This function embodies that tradeoff. You will encounter this pattern in monitoring, alerting, and capacity planning.

2. **Magic numbers** -- The `1200` is a "magic number" -- a numeric literal with no explanation. This is generally considered a code smell. The fix is to extract it into a named constant: `const CUSTOMERS_PER_REGION_SERVICE = 1200`. This makes the code self-documenting.

3. **Multiplication for combinatorial estimation** -- When you have multiple independent dimensions (regions x services), multiplying their counts gives you the total number of combinations. This is basic combinatorics and appears frequently in system design.

4. **Function naming as documentation** -- `estimateCustomerImpact` tells you three things: it is an estimate (not exact), it is about customers (not servers), and it measures impact (not just count). Good names reduce the need for comments.

## Common Mistakes

1. **Treating estimates as exact numbers** -- If this function returns 14,400, someone might put "14,400 customers affected" in the incident report. It should say "approximately 14,000" or "roughly 15,000." The false precision of a specific number like 14,400 implies more accuracy than exists.

2. **Forgetting to name your constants** -- Writing `* 1200` directly in the formula means the next person to read this code has to guess what 1,200 means. Always extract magic numbers into named constants.

3. **Not considering zero inputs** -- `estimateCustomerImpact(0, 5)` returns 0. Is that correct? If zero regions are affected, maybe no customers are impacted. But what if the region count is just unknown? Zero and unknown are different things, but this function treats them the same way.

4. **Multiplication overflow** -- For JavaScript's `number` type, this is unlikely with realistic inputs, but in languages with fixed-size integers, multiplying large numbers can overflow. Good to be aware of.

## Mini Exercises

### Exercise 1: Extract the Magic Number
Replace `1200` with a named constant. Pick a descriptive name and declare it at the top of the file. Consider whether it should be `const` or configurable.

<details>
<summary>Hint</summary>

```typescript
const ESTIMATED_CUSTOMERS_PER_REGION_SERVICE = 1200;

export function estimateCustomerImpact(regionCount: number, serviceCount: number) {
  return regionCount * serviceCount * ESTIMATED_CUSTOMERS_PER_REGION_SERVICE;
}
```

</details>

### Exercise 2: Add a Confidence Level
Modify the function to return an object with `estimatedCustomers` and `confidence` fields. If both counts are above 0, confidence is `"low"`. If you had per-region data (hypothetically), confidence would be `"high"`. Think about why tracking confidence alongside estimates is valuable.

<details>
<summary>Hint</summary>

```typescript
export function estimateCustomerImpact(regionCount: number, serviceCount: number) {
  return {
    estimatedCustomers: regionCount * serviceCount * 1200,
    confidence: "low" as const,
  };
}
```

Tracking confidence helps decision-makers know whether to trust the number or dig deeper.
</details>

### Exercise 3: Accept Per-Region Weights
Refactor the function to optionally accept a third parameter `regionWeights: Record<string, number>` that maps region names to customer counts. If provided, sum the customer counts for affected regions instead of using the flat multiplier.

<details>
<summary>Hint</summary>

This is trickier because now you need region *names*, not just a count. You might need to change the first parameter from `regionCount: number` to `regions: string[]`. Then:

```typescript
const totalCustomers = regions.reduce((sum, region) => {
  return sum + (regionWeights[region] ?? 1200);
}, 0);
return totalCustomers * serviceCount;
```

</details>

## Further Reading

- **Magic numbers and named constants** -- Search for "magic number code smell" to understand why unexplained numeric literals make code harder to maintain.
- **Fermi estimation** -- The technique of making rough order-of-magnitude calculations with limited data. Named after physicist Enrico Fermi. This function is essentially a Fermi estimate.
- **Incident communication** -- How to communicate impact numbers during an outage. Look into "incident communication templates" for best practices.
- **Dimensional analysis** -- A technique from physics for checking whether your math makes sense by tracking the units (regions * services * customers/region-service = customers).
