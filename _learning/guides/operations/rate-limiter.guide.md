# Guide: Rate Limiter

**File:** `src/lib/operations/rate-limiter.ts`

## Purpose

The rate limiter controls **how often** operators can run commands. Even with proper validation, dry-runs, and approvals in place, you do not want someone (or some automated script) to fire off 500 operations per minute. Rate limiting prevents abuse, protects downstream systems from overload, and adds a speed bump that catches runaway automation.

This is different from API rate limiting (which controls HTTP requests). This is **operational rate limiting** -- controlling how many dangerous, stateful operations a specific operator can trigger within a time window.

## The Code

```typescript
export async function checkRateLimit(operatorId: string, command: string) {
  return { allowed: true, remaining: 10, operatorId, command };
}
```

## Line-by-Line Walkthrough

### `export async function checkRateLimit(operatorId: string, command: string) {`

- `export async function` -- public and async, following the module-wide convention.
- `checkRateLimit` -- the name says "check," not "enforce." This is a deliberate distinction. The function **checks** whether the limit has been exceeded and returns a result. It is up to the caller (the engine) to **enforce** the result by refusing to execute if `allowed` is `false`. This separation of concerns makes testing easier -- you can test the rate limiter's logic independently of the engine's enforcement.
- `operatorId: string` -- who is performing the operation. Rate limits are per-operator, not global. Alice might have 10 operations remaining while Bob has 0. This prevents one person's activity from blocking everyone else.
- `command: string` -- the dot-notation command key. Different commands might have different rate limits. You might allow 50 `feature-flag.toggle` operations per hour (low risk) but only 5 `customer.delete` operations per hour (high risk).

### `return { allowed: true, remaining: 10, operatorId, command };`

The return value is a status report:

- `allowed: true` -- the operator is within their rate limit. In the stub, this is always `true`. A real implementation would check counters.
- `remaining: 10` -- how many more operations the operator can perform before hitting the limit. This is useful for UI display ("You have 3 operations remaining this hour") and for automation that needs to pace itself.
- `operatorId` -- echoed back for the caller's convenience.
- `command` -- echoed back for the same reason.

## What This Function Will Become

A real rate limiter needs persistent storage to track operation counts across requests. Here is a sketch using Redis (the most common choice for rate limiting):

```typescript
import { redis } from "@/lib/redis";

type RateLimitConfig = {
  maxOperations: number;
  windowSeconds: number;
};

// Different commands have different limits
const rateLimits: Record<string, RateLimitConfig> = {
  "customer.delete": { maxOperations: 5, windowSeconds: 3600 },
  "customer.plan.change": { maxOperations: 20, windowSeconds: 3600 },
  "feature-flag.toggle": { maxOperations: 50, windowSeconds: 3600 },
  // Default for any command not explicitly configured
  default: { maxOperations: 30, windowSeconds: 3600 },
};

export async function checkRateLimit(operatorId: string, command: string) {
  const config = rateLimits[command] ?? rateLimits.default;
  const key = `rate-limit:${operatorId}:${command}`;

  // Get current count from Redis
  const current = await redis.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= config.maxOperations) {
    const ttl = await redis.ttl(key);
    return {
      allowed: false,
      remaining: 0,
      operatorId,
      command,
      retryAfterSeconds: ttl,
      message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
    };
  }

  // Increment the counter (and set expiry if this is the first operation in the window)
  await redis.multi()
    .incr(key)
    .expire(key, config.windowSeconds)
    .exec();

  return {
    allowed: true,
    remaining: config.maxOperations - count - 1,
    operatorId,
    command,
  };
}
```

Notice that the real implementation does two things: it **checks** the rate and it **increments** the counter. This means calling `checkRateLimit` has a side effect. Some systems separate these into `checkRateLimit` (read-only) and `consumeRateLimit` (increments the counter), so you can check without consuming.

## Concepts Taught

### 1. Rate Limiting Fundamentals

Rate limiting answers the question: "How many times can X do Y within Z time?" The three variables are:

- **X (Identity):** Who or what is being limited? In this system, it is the `operatorId`. In an API, it might be an IP address, an API key, or a user account.
- **Y (Action):** What is being limited? Here, it is a specific command. You could also limit all commands globally per operator, or limit specific dangerous ones more tightly.
- **Z (Window):** The time period. Common windows are per-second, per-minute, per-hour, or per-day.

### 2. Common Rate Limiting Algorithms

There are several well-known approaches:

**Fixed Window:** Count operations in fixed time slots (e.g., 0:00-0:59, 1:00-1:59). Simple but has a burst problem at window boundaries -- you could do 10 operations at 0:59 and 10 more at 1:00, effectively doing 20 in 2 seconds.

**Sliding Window:** Smooth out the fixed window by considering a rolling time period. More accurate but slightly more complex to implement.

**Token Bucket:** Operators get tokens at a steady rate (e.g., 1 per minute). Each operation costs a token. If you have no tokens, you wait. Allows short bursts (if tokens have accumulated) while enforcing long-term limits.

**Leaky Bucket:** Operations are added to a "bucket" that "leaks" at a constant rate. If the bucket is full, new operations are rejected. Produces a very smooth, constant rate.

The Redis example above uses fixed window (the simplest). Production systems often use sliding window or token bucket.

### 3. Per-Command Rate Limits

Not all operations are equally dangerous. The rate limiter takes the `command` parameter so it can apply different limits:

| Command | Max per hour | Reasoning |
|---|---|---|
| `feature-flag.toggle` | 50 | Low risk, frequent during deployments |
| `customer.plan.change` | 20 | Medium risk, bulk changes common |
| `customer.delete` | 5 | High risk, irreversible |
| `infra.region.failover` | 2 | Extremely high impact |

This tiered approach balances usability (not blocking normal work) with safety (limiting dangerous actions).

### 4. Check vs Enforce Separation

The rate limiter **checks** and **reports**. It does not throw errors or block execution. The engine reads the result and decides what to do. This is the same pattern as the validator: the module provides information, the caller acts on it.

Why this separation?

- **Testability:** You can unit-test the rate limiter without the engine.
- **Flexibility:** The engine might want to override rate limits for emergency operations (with proper approval).
- **Observability:** The rate limit check result can be logged even when the operation is not blocked.

### 5. The `remaining` Count

Telling the caller how many operations they have left is a UX feature borrowed from API design. HTTP rate-limited APIs often return `X-RateLimit-Remaining` headers. The same concept applies here -- operators should be able to see "I have 3 operations left this hour" before they run into a hard block. Surprises are bad UX.

## Common Mistakes

### 1. Race conditions in rate limiting

If two requests check the rate limit at the same time, both see `count = 9` (with a limit of 10), both decide it is allowed, and both increment to 10 and 11 respectively. Now you have exceeded the limit. This is a classic race condition.

The fix is atomic operations. In Redis, `INCR` is atomic -- it increments and returns the new value in a single step. You increment first, then check if the new value exceeds the limit:

```typescript
const newCount = await redis.incr(key);
if (newCount === 1) {
  await redis.expire(key, windowSeconds); // Set expiry on first operation
}
if (newCount > maxOperations) {
  return { allowed: false, remaining: 0 };
}
```

### 2. Forgetting to set expiry on the counter

If you increment a counter but never set a TTL (time-to-live), the counter grows forever and eventually blocks all operations permanently. Always pair the counter with an expiry.

### 3. Hardcoding limits without configuration

Rate limits should be configurable, not hardcoded. What seems like a good limit today might be too restrictive (or too permissive) tomorrow. Store limits in a configuration file, database, or environment variables so they can be changed without deploying code.

### 4. Not differentiating between operators

A global rate limit (shared across all operators) means one person's burst of activity blocks everyone else. Per-operator limits are almost always what you want for admin operations.

### 5. Blocking emergency operations

During an incident, the on-call engineer might need to run 20 `infra.region.failover` operations. If the rate limit blocks them, the system is hurting rather than helping. Consider an "emergency bypass" mode (with its own audit trail) for critical situations.

## Mini Exercises

### Exercise 1: Add Parameters to the Stub

Expand the stub so the return type includes `retryAfterSeconds: number | null`. When `allowed` is `true`, it should be `null`. When `allowed` is `false`, it should be a number (say, 60). Add a simple check: if the `command` is `"infra.region.failover"`, always return `allowed: false` with `remaining: 0` and `retryAfterSeconds: 300` (a 5-minute cooldown). Otherwise, return the current stub response.

<details>
<summary>Hint</summary>

```typescript
export async function checkRateLimit(operatorId: string, command: string) {
  if (command === "infra.region.failover") {
    return {
      allowed: false,
      remaining: 0,
      operatorId,
      command,
      retryAfterSeconds: 300,
    };
  }

  return {
    allowed: true,
    remaining: 10,
    operatorId,
    command,
    retryAfterSeconds: null,
  };
}
```
</details>

### Exercise 2: Implement an In-Memory Rate Limiter

Without Redis or any external storage, implement a simple fixed-window rate limiter using a `Map`. The key is `${operatorId}:${command}`, and the value tracks the count and the window start time. If the window has expired (more than `windowMs` milliseconds since the start), reset the counter.

<details>
<summary>Hint</summary>

```typescript
const counters = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_OPS = 10;

export async function checkRateLimit(operatorId: string, command: string) {
  const key = `${operatorId}:${command}`;
  const now = Date.now();
  const entry = counters.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    counters.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_OPS - 1, operatorId, command };
  }

  if (entry.count >= MAX_OPS) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, operatorId, command, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_OPS - entry.count, operatorId, command };
}
```

Caveat: this only works in a single process. If you have multiple server instances, they each have their own Map and do not share counts.
</details>

### Exercise 3: Write a Token Bucket

Implement a token bucket rate limiter. Each operator starts with `maxTokens` tokens. Tokens regenerate at a rate of `refillRate` tokens per second. Each operation costs 1 token. If no tokens are available, the operation is denied. Track the last refill time and calculate how many tokens have been regenerated since then.

<details>
<summary>Hint</summary>

```typescript
type Bucket = { tokens: number; lastRefill: number };
const buckets = new Map<string, Bucket>();
const MAX_TOKENS = 10;
const REFILL_RATE = 1; // 1 token per second

export async function checkRateLimit(operatorId: string, command: string) {
  const key = `${operatorId}:${command}`;
  const now = Date.now() / 1000; // seconds

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + elapsed * REFILL_RATE);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const waitSeconds = Math.ceil((1 - bucket.tokens) / REFILL_RATE);
    return { allowed: false, remaining: 0, operatorId, command, retryAfterSeconds: waitSeconds };
  }

  bucket.tokens -= 1;
  return { allowed: true, remaining: Math.floor(bucket.tokens), operatorId, command };
}
```
</details>

## Further Reading

- **Redis rate limiting patterns:** The official Redis documentation has a section on implementing rate limiters using `INCR` and `EXPIRE`.
- **Token bucket algorithm (Wikipedia):** A clear explanation of the algorithm with diagrams.
- **Stripe's rate limiter blog post:** How Stripe scaled their API rate limiting -- practical and well-written.
- **`@upstash/ratelimit`:** A serverless-friendly rate limiting library built on Redis that supports multiple algorithms.
- **HTTP rate limiting headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` -- standard headers that inspired the `remaining` property in our return value.
- **Circuit breaker pattern:** Related to rate limiting but different -- a circuit breaker stops requests to a **downstream service** that is failing, while a rate limiter stops requests from an **upstream caller** that is sending too many.
