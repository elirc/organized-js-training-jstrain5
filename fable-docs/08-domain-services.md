# Chapter 8 — Domain Services: The Two Real Algorithms, and the Stubs Around Them

> **Mental model:** `src/lib/` holds one folder per business domain — feature flags,
> incidents, approvals, runbooks, audit. Most contain typed stubs that mark where logic will
> live. Two contain *real, finished algorithms* worth studying line by line: the feature-flag
> evaluator and the incident severity classifier. Learn the real ones deeply; learn to read
> the stubs quickly.

## Feature flags: shipping code without releasing it

**The problem.** Deploying code and releasing a feature used to be the same event — scary,
all-or-nothing. Feature flags split them: the code ships dark, then you turn it on for
specific customers, or 10% of traffic, and if it misbehaves you turn it off in seconds
instead of rolling back a deploy. Every serious product company works this way.

### The clever part: [`src/lib/feature-flags/rollout.ts`](../src/lib/feature-flags/rollout.ts)

How do you show a feature to *exactly 30%* of customers, consistently — without storing a
list of who's in?

```typescript
export function hashToBucket(flagKey: string, customerId: string) {
  const source = `${flagKey}:${customerId}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);  // hash*31 + char, via bit shift
    hash |= 0;                                          // clamp to 32-bit integer
  }
  return Math.abs(hash % 100);                          // → a stable number 0–99
}
```

A hash function: same input, same output, forever. `"new-dashboard:cus_042"` always lands
on, say, bucket 37. So "roll out to 30%" is just `bucket < 30` — no database of
assignments, no randomness that flickers between requests. Three properties to internalize:

- **Deterministic:** customer cus_042 sees the feature on every page load, every session.
  A coin flip per request would strobe the feature on and off — the worst possible UX.
- **The flag key is *in* the hash.** `${flagKey}:${customerId}` means each flag shuffles
  customers into different buckets. Without it, the *same* 30% of customers would get
  every experiment — a biased, over-tested cohort.
- **Ratcheting up is safe.** Raise 30% → 50% and buckets 0–29 stay in; buckets 30–49 join.
  Nobody who had the feature loses it.

This is genuinely how LaunchDarkly-class systems work. The `(hash << 5) - hash` idiom is
`hash * 31` (a classic string-hash multiplier) done with a bit shift; `hash |= 0` keeps
JavaScript's number inside 32 bits so it behaves like an integer hash.

### The decision: [`src/lib/feature-flags/evaluator.ts`](../src/lib/feature-flags/evaluator.ts)

```typescript
export function evaluateFlag(flag: FeatureFlag, customer: Customer): boolean {
  if (!flag.isEnabled) return false;                    // ① master kill switch
  if (flag.flagType === "boolean") return true;         // ② on for everyone

  if (flag.flagType === "percentage") {                 // ③ hash decides
    const bucket = hashToBucket(flag.key, customer.id);
    return bucket < flag.rolloutPercentage;
  }

  return flag.targetingRules.some((rule) => {           // ④ targeted: rules
    if (rule.plan && rule.plan !== customer.plan) return false;
    if (rule.region && rule.region !== customer.region) return false;
    if (rule.customerIds && !rule.customerIds.includes(customer.id)) return false;
    return true;
  });
}
```

Guard clauses again (①②, the style from [Chapter 4](04-authentication.md)), then the
subtle part — ④, the rule engine in five lines:

- **Rules are OR'd together** via `.some()`: match *any* rule and you're in.
- **Conditions inside a rule are AND'd** via early `return false`: a rule
  `{ plan: "enterprise", region: "us-east" }` requires *both*.
- **Absent conditions are skipped**: `if (rule.plan && …)` means "check plan only if this
  rule specifies one." So `{ region: "eu-west" }` matches all of EU-West regardless of plan.

`.some()`-for-OR + early-return-for-AND is a reusable micro-pattern — you'll write the
same shape for authorization rules, search filters, and alert routing.

Two honest critiques (knowing a file's flaws is part of knowing the file):
every flag carries `rolloutPercentage` *and* `targetingRules` even when its `flagType`
makes them meaningless — a discriminated union (like the envelope in
[Chapter 5](05-api-layer.md)!) would make invalid combinations unrepresentable. And an
empty `targetingRules` array means `.some()` returns `false` — off for everyone — which
may surprise whoever assumed "no rules = no restrictions."

([`service.ts`](../src/lib/feature-flags/service.ts) — `listFeatureFlags()` returning
`[]` — is the data-access stub; the evaluator stays pure and testable because *fetching*
flags and *evaluating* them are separate concerns.)

## Incidents: turning a number into an alarm level

[`src/lib/incidents/severity.ts`](../src/lib/incidents/severity.ts) — real logic, four lines:

```typescript
export function classifySeverity(errorRate: number) {
  if (errorRate > 0.5) return "sev1";    // >50% failing: all hands, wake the VP
  if (errorRate > 0.2) return "sev2";    // >20%: page on-call now
  if (errorRate > 0.08) return "sev3";   // >8%: urgent business hours
  return "sev4";                          // noticeable, not urgent
}
```

A **classifier**: continuous measurement in, discrete category out. The categories drive
everything downstream — who gets paged, how fast, whether leadership is told (the
`incidentSeverityEnum` in the schema stores exactly these values). Order matters: the
checks must run highest-threshold-first, or every incident classifies as sev3/sev4.
Reordering these lines is a one-character-diff outage — which is why exercises below make
you break it on purpose.

[`impact.ts`](../src/lib/incidents/impact.ts) is one line —
`regionCount * serviceCount * 1200` — and the lesson is *why it's allowed to be crude*:
during an incident, a fast rough answer to "how many customers are affected?" beats a
precise answer that takes 30 minutes. Back-of-envelope math is a legitimate engineering
tool when you label it as such. ([`service.ts`](../src/lib/incidents/service.ts) creates
the incident record — stub, but note it stamps `status: "declared"`, the first state in
the schema's `incidentStatusEnum` lifecycle.)

## The audit log: the security camera

[`src/lib/audit/log.ts`](../src/lib/audit/log.ts) is a stub with a production-grade *type*.
Read the type as a spec of what "who did what" actually requires:

```typescript
export type AuditLogInput = {
  operatorId: string;          // WHO
  action: string;              // did WHAT
  resourceType: string;        // to WHICH KIND of thing
  resourceId: string;          //   …which one exactly
  oldValue?: Record<string, unknown>;   // the diff: before…
  newValue?: Record<string, unknown>;   //   …and after
  dangerLevel?: "safe" | "moderate" | "dangerous" | "critical";
  operationId?: string;        // link to the pipeline run (Chapter 7)
  requestId?: string;          // link to the middleware trace (Chapter 1!)
  ipAddress?: string;          // from WHERE
  userAgent?: string;
};
```

Notice `requestId` — the same `x-request-id` the middleware stamps on every request in
[Chapter 1](01-big-picture.md). That's the thread that lets you join an audit entry to
server logs to a user's bug report: one ID across every layer. And `oldValue`/`newValue`:
good audit logs record the *diff*, not just "customer updated" — because the question
auditors actually ask is "what did it say *before*?"

Why audit logging is non-negotiable in an admin tool: it deters misuse (people behave
differently when actions are attributed), it answers compliance auditors, and it's how
you reconstruct what happened during an incident. The current implementation only
`console.log`s in development — the schema's `auditLog` table is waiting for it.

## Reading the remaining stubs in ninety seconds

You've now seen every stub *shape* this codebase uses. Apply the pattern-recognition:

| Module | Stub | What the signature promises |
|---|---|---|
| [`approvals/service.ts`](../src/lib/approvals/service.ts) | `createApprovalRequest(operationId)` → `{ status: "pending" }` | approvals attach to operations, start pending |
| [`approvals/notifications.ts`](../src/lib/approvals/notifications.ts) | `notifyApprovers(approvalId)` | someone must *hear about* pending approvals |
| [`runbooks/templates.ts`](../src/lib/runbooks/templates.ts) | 4 template names, `as const` | runbooks are predefined procedures, not freeform |
| [`runbooks/service.ts`](../src/lib/runbooks/service.ts) / [`executor.ts`](../src/lib/runbooks/executor.ts) | list / run | same service/engine split as operations |
| [`db/read-models/*`](../src/lib/db/read-models) | `refresh…ReadModel()` | expensive summaries computed on a schedule ([Chapter 3](03-data-layer.md)) |
| [`simulators/*`](../src/lib/simulators) | `run…Generator()` | fake incidents/usage/health, so you can develop a monitoring UI without real outages |

That last one deserves a sentence: simulators exist because you can't build an incident
dashboard while waiting for real incidents. Generating realistic fake *events* (not just
static mock rows) is standard practice for internal tools.

## Common junior mistakes

- **Evaluating flags with `Math.random()`.** Non-deterministic: the feature flickers per
  request. If you remember one thing from this chapter: *hash, don't roll dice*.
- **Deleting "finished" flags never.** Flags are meant to be temporary; a codebase with 200
  stale flags has 2^200 configuration states. Real teams schedule flag removal as part of
  the rollout plan.
- **Confusing `.some()` and `.every()`.** OR vs AND. Swapping them silently inverts a rule
  engine — no crash, just wrong answers. Test rule logic with cases designed to
  differentiate the two.
- **Auditing only successes.** Failed and *denied* actions are often the interesting ones
  ("who tried to export all customer data and got a 403?"). Log attempts, not just wins.
- **Treating threshold constants as untouchable magic.** `0.5 / 0.2 / 0.08` are business
  decisions someone made; they should be named, documented, and revisited. When you meet
  bare numbers in classifiers, ask where they came from — that question is a good code
  review comment.

## Try it yourself

1. **Verify determinism empirically.** In a scratch file, call
   `hashToBucket("new-dashboard", "cus_001")` in a loop of 10 — same number every time.
   Then compute buckets for 1,000 generated IDs and count how many land under 30. You
   should get roughly 300. You've just tested both properties that matter (stability and
   uniformity) with twelve lines of code.
2. **Break the classifier's ordering.** Reverse the first two `if`s in
   `classifySeverity` (check `> 0.2` before `> 0.5`) and hand-trace `errorRate = 0.6`.
   It returns `"sev2"` — a total outage, classified as merely urgent. Nobody wakes up.
   One swapped line, real-world consequence. Revert.
3. **Predict the rule engine.** For flag rules
   `[{ plan: "enterprise", region: "us-east" }, { customerIds: ["cus_042"] }]`, decide on
   paper whether these get the feature: (a) enterprise/us-east customer, (b)
   enterprise/eu-west customer, (c) cus_042 on the free plan. Then verify by running
   `evaluateFlag` in a scratch file. (Answers: yes, no, yes — if you said (b) yes, reread
   the AND-within-a-rule part.)
**Running items 1 and 3 without installing anything (Node 22.6 or later).** `rollout.ts` has no imports, so `node --experimental-strip-types` can import it directly. `evaluator.ts` imports `@/lib/feature-flags/rollout`, an alias that only the TypeScript and Next.js config resolve. Copy both files to a scratch folder and change that import to `./rollout.ts`. Run that way, item 1 should print a single distinct bucket for the ten calls (`hashToBucket` has no randomness, `rollout.ts:1-9`) and a count near 300 for the 1,000 IDs, and item 3 should print `true false true`. Write down the exact numbers you get; they are your baseline if anyone changes the hash. One more case is worth adding to your tests: a targeting rule written as `{}` (no plan, region or customer list) returns `true` for *every* customer, because none of its `if`s can reject (`evaluator.ts:28-33`). One empty object in the admin UI turns a targeted flag into a global launch. Validate rules at write time so that each one carries at least one condition.

4. **Design review, on paper.** Sketch the discriminated-union version of `FeatureFlag`
   (three types, each carrying only its relevant fields) the way
   [Chapter 5](05-api-layer.md)'s envelope does it. Which impossible states does your
   version eliminate? This is exactly the kind of refactor proposal juniors can bring to a
   team and be taken seriously.

## Ask your agent

> "In this repo, write unit-style tests (plain tsx script is fine — there's no test runner
> configured) for evaluateFlag in src/lib/feature-flags/evaluator.ts covering: disabled
> flag, boolean flag, percentage boundaries (0 and 100), a targeted rule with AND
> conditions, OR across rules, and the empty-targetingRules edge case. Tell me which case
> you expect to be the most surprising and why."

Two things to grade: does its empty-rules test assert `false` (the actual behavior) rather
than what seems intuitive? And did it *notice* there's no test runner and adapt, instead of
hallucinating a `npm test` that doesn't exist? Agents that verify project reality before
acting are the trustworthy kind — that's the standard [Chapter 9](09-ai-assisted-engineering.md)
teaches you to hold them to.

---

**You can now:** explain deterministic percentage rollouts well enough to whiteboard them
in an interview, read and fix rule-engine logic, state what a production audit entry must
contain, and extract the promise from any stub in one read.

**Next:** [Chapter 9 — AI-Assisted Engineering](09-ai-assisted-engineering.md): how to make
coding agents productive in this repo — and how to stay the engineer while doing it.
