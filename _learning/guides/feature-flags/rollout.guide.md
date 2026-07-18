# Guide: Feature Flag Rollout (Hash-to-Bucket)

**File:** `src/lib/feature-flags/rollout.ts`

## Purpose

This file solves a surprisingly tricky problem: how do you roll out a feature to exactly 30% of your customers in a way that is consistent, deterministic, and does not require storing which customers are "in" or "out"?

The answer is hashing. You take the flag name and the customer ID, mash them together, run them through a hash function, and get a number between 0 and 99. If that number is less than 30, the customer gets the feature. The same customer always gets the same number for the same flag, so their experience is consistent across requests and sessions.

This is how real feature flag systems (LaunchDarkly, Split, Unleash) work under the hood.

## The Code

```typescript
export function hashToBucket(flagKey: string, customerId: string) {
  const source = `${flagKey}:${customerId}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100);
}
```

## Line-by-Line Walkthrough

### `const source = \`${flagKey}:${customerId}\`;`

Combines the flag key and customer ID into a single string, separated by a colon. For example, `"new-dashboard:cust_123"`. The colon prevents ambiguity -- without it, flag `"ab"` + customer `"cd"` and flag `"a"` + customer `"bcd"` would produce the same source string `"abcd"`.

Including the flag key is important: it means the same customer gets a *different* bucket for each flag. If you only hashed the customer ID, then the same 30% of customers would get *every* feature at 30% rollout. Including the flag key randomizes the distribution independently per flag.

### `let hash = 0;`

Initializes the hash accumulator. We will build up this value one character at a time.

### `for (let i = 0; i < source.length; i += 1) {`

Iterates over every character in the source string. Note: `i += 1` is used instead of `i++`. They are functionally identical here -- this is a style choice. Some linting rules prefer `+= 1` because `++` has tricky precedence rules in complex expressions.

### `hash = (hash << 5) - hash + source.charCodeAt(i);`

This is the core of the hash algorithm. Let's break it apart:

- `hash << 5` -- left bit-shift by 5. This is equivalent to multiplying by 32 (`2^5`). Bit shifting is much faster than multiplication (though modern JavaScript engines optimize both).
- `(hash << 5) - hash` -- this equals `hash * 32 - hash`, which is `hash * 31`. The number 31 is a prime number, which is significant. Prime multipliers produce better distribution in hash functions (fewer collisions).
- `+ source.charCodeAt(i)` -- adds the Unicode code point of the current character. `"a".charCodeAt(0)` is 97, `"A".charCodeAt(0)` is 65, `"1".charCodeAt(0)` is 49.

So each iteration does: `newHash = oldHash * 31 + currentCharCode`. This is actually the same algorithm as Java's `String.hashCode()`. It is well-known, fast, and has reasonable distribution for this use case.

### `hash |= 0;`

The bitwise OR with zero is a JavaScript trick to force the number to a 32-bit integer. JavaScript numbers are 64-bit floats by default. Without this line, the hash could grow beyond 32-bit integer range and lose precision due to floating-point math. `|= 0` truncates it back to 32 bits, keeping the value in integer range. This is subtle but important.

### `return Math.abs(hash % 100);`

- `hash % 100` -- modulo 100 gives a number between -99 and 99. The result can be negative because `hash` can be negative (bit operations on 32-bit integers treat the high bit as a sign bit).
- `Math.abs(...)` -- takes the absolute value, giving you a number between 0 and 99. This is your "bucket."

The result is a number from 0 to 99 inclusive (100 possible buckets). To check if a customer is in a 30% rollout, you check `bucket < 30`.

## Honesty About Code Quality

This is actually a reasonable implementation for its purpose. Some notes:

- **This is not a cryptographic hash.** It is not meant to be. You do not need security here -- you need speed and decent distribution. If someone "cracks" the hash and figures out their bucket number, nothing bad happens.
- **Distribution is not perfectly uniform.** The djb2-ish hash (hash * 31 variant) has known biases for short inputs. For feature flags, this is acceptable. For anything security-related, use a proper cryptographic hash.
- **No unit tests visible here.** A hash function like this absolutely should have tests verifying that distribution is roughly uniform across a sample of inputs.
- **The `Math.abs` is needed but easy to forget.** If someone removes it thinking "modulo already gives a small number," they will get negative bucket numbers and the flag evaluator will break.

## Concepts Taught

1. **Deterministic hashing** -- The same inputs always produce the same output. This is critical for feature flags because a customer should not flip between "feature on" and "feature off" on every request.

2. **Bitwise operations** -- `<<` (left shift), `|` (bitwise OR). These operate on the binary representation of numbers. They are uncommon in typical web development but fundamental in hash functions, low-level programming, and performance-critical code.

3. **The modulo operator for bucketing** -- `% 100` maps any integer to the range 0-99. This is the standard technique for distributing items into a fixed number of buckets. You will see it in load balancing, sharding, and distributed systems.

4. **Hash function design** -- Why multiply by a prime (31)? Why include both the flag key and customer ID? Why force 32-bit integers? Each decision has a reason rooted in how hash functions achieve good distribution.

5. **The `|= 0` trick** -- This is JavaScript-specific and worth knowing. It converts a 64-bit float to a 32-bit integer. You will see it in performance-sensitive code and anywhere that works with bit manipulation.

## Common Mistakes

1. **Hashing only the customer ID** -- If you leave out the flag key, every flag rolls out to the *same* group of customers. The first 30% always get everything. Including the flag key ensures independent randomization per flag.

2. **Forgetting `Math.abs`** -- In JavaScript, the modulo of a negative number is negative: `-7 % 100` is `-7`, not `93`. Since bucket numbers should be 0-99, you need the absolute value.

3. **Assuming the distribution is perfectly uniform** -- It is close but not perfect. If you check a million customers, you might get 30.2% in a 30% rollout instead of exactly 30%. For feature flags this is fine. For statistical sampling, you might need a better hash.

4. **Using `Math.random()` instead of hashing** -- Random numbers are not deterministic. Customer A might see the feature on one request and not the next. Hashing solves this because the same inputs always produce the same bucket.

## Mini Exercises

### Exercise 1: Test Distribution
Write a loop that generates 10,000 fake customer IDs (like `"cust_0"` through `"cust_9999"`), hashes each one with the flag key `"test-flag"`, and counts how many fall in each bucket (0-99). Are the buckets roughly evenly distributed?

<details>
<summary>Hint</summary>

```typescript
const counts = new Array(100).fill(0);
for (let i = 0; i < 10000; i++) {
  const bucket = hashToBucket("test-flag", `cust_${i}`);
  counts[bucket]++;
}
// Each bucket should have roughly 100 entries (10000 / 100)
console.log(Math.min(...counts), Math.max(...counts));
```

</details>

### Exercise 2: Verify Determinism
Call `hashToBucket("my-flag", "customer-42")` ten times and verify you get the same result each time. Then change the flag key and verify the result changes.

<details>
<summary>Hint</summary>

```typescript
for (let i = 0; i < 10; i++) {
  console.log(hashToBucket("my-flag", "customer-42")); // should print the same number 10 times
}
console.log(hashToBucket("other-flag", "customer-42")); // should be different
```

</details>

### Exercise 3: Understand the Bit Trick
Open a console and compute these values:
- `5 << 5` (what does left-shifting 5 by 5 give you?)
- `(5 << 5) - 5` (why is this 5 * 31?)
- `-7 % 100` (why is this -7 and not 93?)
- `-7 | 0` (what does this produce?)

<details>
<summary>Hint</summary>

- `5 << 5` = `160` (which is 5 * 32)
- `(5 << 5) - 5` = `155` (which is 5 * 31)
- `-7 % 100` = `-7` (JavaScript modulo preserves the sign of the dividend)
- `-7 | 0` = `-7` (already a 32-bit integer, so no change)

</details>

## Further Reading

- **Hash functions** -- Read about djb2, FNV-1a, and MurmurHash. They are all fast, non-cryptographic hash functions used in practice.
- **Feature flag architecture** -- LaunchDarkly's blog explains how they handle percentage rollouts at scale. The hashing approach described here is the same fundamental idea.
- **Bitwise operators in JavaScript** -- MDN's documentation on bitwise operators is thorough. Focus on `<<`, `>>`, `|`, and `&`.
- **The birthday problem** -- Understand why hash collisions are more likely than you would intuit. It is relevant to any system that relies on hashing for distribution.
