# Chapter 7 — The Operations Engine: Making Dangerous Actions Safe

> **Mental model:** an "operation" is a dangerous verb — suspend a customer, void an invoice,
> fail over a region. The engine's job is to make every dangerous verb pass through the same
> safety pipeline: **validate → rate-limit → approve (maybe) → simulate → queue → execute in
> the worker → audit → (if needed) roll back**. Each stage is its own small module. Most
> bodies are stubs today; the *pipeline shape* is the lesson.

This is the heart of the app, and it's also where the schema from
[Chapter 3](03-data-layer.md) pays off: the `operations` table's columns (`status`,
`dangerLevel`, `dryRun` defaulting to `true`, `idempotencyKey` with a unique index) are this
pipeline, expressed as data.

## The command pattern: one interface, sixteen implementations

Everything starts with a five-line contract —
[`src/lib/operations/commands/base.ts`](../src/lib/operations/commands/base.ts), the entire file:

```typescript
export type OperationCommand = {
  key: string;                                                          // "customer.suspend"
  dryRun: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  execute: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
};
```

**The problem this solves.** The naive design is one giant function:

```typescript
// what you'd write without the pattern — DON'T
function executeOperation(command: string, payload: any) {
  switch (command) {
    case "customer.suspend": /* … */
    case "billing.refund":   /* … */
    // …50 more cases, one merge conflict magnet, growing forever
  }
}
```

Every new operation means editing the same hot file. With the command pattern, every
operation is *its own file* conforming to the shared type. Look at
[`src/lib/operations/commands/`](../src/lib/operations/commands) — sixteen command files plus `base.ts` and `registry.ts`
(`customer-suspend.ts`, `billing-refund.ts`, `infra-region-failover.ts`, …), each shaped
exactly like [`customer-plan-change.ts`](../src/lib/operations/commands/customer-plan-change.ts):

```typescript
export const customer_plan_change: OperationCommand = {
  key: "customer.plan.change",
  dryRun: async (payload) => ({ mode: "dry-run", payload,
    message: "Simulation complete for customer-plan-change." }),
  execute: async (payload) => ({ mode: "execute", payload,
    message: "Execution queued for customer-plan-change." }),
};
```

In principle, adding operation #17 means adding one file and touching nothing else. (In this repo, `registerCommand` is defined but never called, so a new file is not picked up yet. Exercise 3 below has you find that.) That's the
**Open/Closed Principle** in its practical form: open for extension, closed for
modification. Notice also that *every* command carries `dryRun` alongside `execute` — the
type makes it impossible to build an operation without a simulation mode. Safety encoded in
the contract, the same trick as `dryRun: true` being the schema default.

Yes, all sixteen bodies are placeholders. Read them for their *keys* instead: the
dot-notation (`customer.suspend`, `billing.invoice.void`, `infra.region.failover`) is a
namespace, and [`src/lib/approvals/policies.ts`](../src/lib/approvals/policies.ts) will
match against it (`command.includes("delete")`). Naming schemes are load-bearing.

## The registry: looking up verbs by name

[`src/lib/operations/commands/registry.ts`](../src/lib/operations/commands/registry.ts), whole file:

```typescript
const registry = new Map<string, OperationCommand>();

export function registerCommand(command: OperationCommand) {
  registry.set(command.key, command);
}

export function getCommand(key: string) {
  return registry.get(key);   // ← returns OperationCommand | undefined — callers must handle it!
}
```

The engine never imports sixteen command files; it asks the registry for
`getCommand("billing.refund")` and gets back *something that satisfies the contract*,
without knowing or caring which file provided it. This decoupling is what lets commands be
added/removed without touching the engine — and it's a miniature of how plugin systems,
route tables, and dependency injection containers all work. One thing to notice as a
reader: `getCommand` can return `undefined` (a key nobody registered). Every caller must
handle that. An API route mapping a user-supplied command string to a registry lookup must
answer "unknown command" with a clean envelope error, not a crash.

## The pipeline stages (and what each stub is promising)

**[`engine.ts`](../src/lib/operations/engine.ts)** — the orchestrator. Today:
`executeOperation(operationId)` returns `{ operationId, status: "queued" as const }`. The
real version will be the conductor calling every stage below in order. The stub already
teaches one idiom: `as const` narrows `status` to the literal type `"queued"` instead of
`string` — so code switching on status gets exhaustiveness checking.

**[`validators.ts`](../src/lib/operations/validators.ts)** — is the request *well-formed
and sane*? Returns `{ valid: true, blockers: [] as string[] }`. Note the `as string[]`: a
bare `[]` infers the useless type `never[]` (an array nothing can be pushed into).
Annotating empty arrays is a small TypeScript survival skill you'll use weekly. Boundary
validation for HTTP inputs already happened in the API layer
([Chapter 5](05-api-layer.md)); this stage validates *business* preconditions ("does this
customer even exist? is the refund amount positive?").

**[`rate-limiter.ts`](../src/lib/operations/rate-limiter.ts)** — `checkRateLimit(operatorId,
command)`. Read the *signature*: limits are per-operator *and* per-command. This is
operational rate limiting — not "too many HTTP requests" but "no human (or runaway script
wearing a human's credentials) should suspend 500 customers a minute." Internal tools need
speed bumps precisely because their users are trusted.

**Approvals** ([`src/lib/approvals/policies.ts`](../src/lib/approvals/policies.ts)) — the
one *real* line of policy in the pipeline:

```typescript
export function requiresApproval(command: string, targetCount: number) {
  return command.includes("delete") || targetCount > 100;
}
```

Deletions and bulk operations need a second human. Recall from
[Chapter 4](04-authentication.md) that `ops_engineer` has `operations.execute` but not
`operations.approve` — the permission map and this policy together implement separation of
duties. (Exercise 2 below asks you to find this function's loophole. There is one.)
[`service.ts`](../src/lib/approvals/service.ts) creates the pending request;
[`notifications.ts`](../src/lib/approvals/notifications.ts) tells approvers it exists —
stub, but deceptively important: an approval nobody hears about is an operation that
silently never happens.

**[`dry-run.ts`](../src/lib/operations/dry-run.ts)** — `simulateOperation(command,
targetIds)` returns `{ command, targetCount, blockers, warnings }`. Two ideas to keep:

- **Blockers vs. warnings** is a UX vocabulary you'll reuse forever: a *blocker* is a hard
  stop ("customer has a legal hold — cannot delete"); a *warning* is "may proceed, but
  look first" ("refund amount is in the top 1%"). Red disables the button; yellow demands
  a confirmation.
- **A dry run must never mutate anything.** If your simulation writes to the database,
  it's an execution wearing a costume. This mirrors `terraform plan` vs `apply`.

**The queue and the worker** — the payoff of the whole design.
[`worker/index.ts`](../worker/index.ts):

```typescript
const operationQueue = new Queue("opsforge-operations", { connection: redisConnection });

new Worker("opsforge-operations", async (job) => {
  console.log(`Processing job ${job.id} (${job.name})`);
  return { processedAt: new Date().toISOString() };
}, { connection: redisConnection });
```

Why a queue at all? Because "suspend 500 customers" takes minutes, and an HTTP request that
takes minutes times out. So the API route *produces* a job into Redis (via BullMQ) and
instantly responds "queued" — that's why the engine stub returns `status: "queued"`, not
`"done"`! — and this worker, **a completely separate Node.js process** (its own
docker-compose service, remember [Chapter 2](02-tooling.md)), *consumes* jobs at its own
pace. Producer–consumer. The web server stays responsive; the heavy lifting happens
elsewhere; and if the worker crashes mid-job, the queue still holds the job for retry.

This is also where **idempotency** stops being abstract: queues deliver jobs *at least
once* — retries and crashes mean the same job can arrive twice. The unique
`idempotencyKey` in the operations table is what makes the second delivery a harmless
no-op instead of a double refund.

**[`rollback.ts`](../src/lib/operations/rollback.ts)** — the undo button, returning
`rollback_queued` (undo is itself a queued operation!). Honest framing: some operations
reverse trivially (re-enable a flag), some painfully (un-suspend and apologize), some never
(data purged from backups). Having rollback as a *first-class pipeline stage* forces every
new command's author to at least answer "how would I undo this?" — which is the real point.

**[`audit/log.ts`](../src/lib/audit/log.ts)** — every stage reports here. Covered in depth
in [Chapter 8](08-domain-services.md); for now: if it isn't audited, it didn't happen
(compliance version).

## Common junior mistakes

- **Bypassing the pipeline "just this once."** Production is down, so you write a quick
  endpoint that calls the database directly, skipping validation/approval/audit. Now there's
  an unaudited mutation path, and next quarter someone uses it for something worse. If the
  pipeline is too slow for emergencies, build an *audited* break-glass path — don't tunnel
  under the wall.
- **Forgetting `getCommand` can return `undefined`.** A typo'd command key crashes the
  engine with `Cannot read properties of undefined (calling 'execute')`. Handle the lookup
  miss explicitly.
- **Doing slow work in the request.** If a handler takes more than a second or two of real
  work, it belongs in the queue. The symptom users see: spinners, gateway timeouts,
  double-clicks creating duplicates (see: idempotency).
- **Testing `execute` and skipping `dryRun`.** The simulation path is a *product feature*
  operators rely on to preview danger. An inaccurate dry run is worse than none — it
  manufactures false confidence.
- **Sharing state between web and worker via variables.** They're separate processes.
  Anything they share must live in Postgres or Redis. (Third mention in this doc set;
  it's the mistake that best survives being warned about.)

## Try it yourself

1. **Watch the producer–consumer pair live.** Terminal A: `docker compose up -d redis`,
   then `npm run worker`. You'll see `OpsForge worker online.` and — a moment later — a log
   line for the `worker-heartbeat` job that `bootstrap()` enqueued. That log line is a job
   making the full round trip: producer → Redis → consumer. Now stop the worker (Ctrl+C).
2. **Find the approval loophole.** Read `requiresApproval` again. The
   `customer_delete` command's key is `"customer.delete"` — caught by
   `includes("delete")`. Now: what about a *new* command someone names
   `"customer.purge"`? Or `"customer.remove"`? Write the one-sentence policy bug report,
   then sketch a better design (hint: the schema already has `dangerLevel` — policy should
   key off declared danger, not substring luck).
3. **Add command #17.** Create `src/lib/operations/commands/customer-merge.ts` following
   the pattern (key: `"customer.merge"`), and register it wherever you find the other
   commands being registered — search for `registerCommand` usages first. What you learn
   from that search *is the exercise*: is there central registration, or is it still
   scaffolded? Report what you find, like you would in a standup.
4. **Predict, then open.** Given everything above, write down the contents of
   [`src/lib/operations/rollback.ts`](../src/lib/operations/rollback.ts) before opening it.
   You should be able to get within a token or two. Consistency makes codebases predictable
   — and predictability is what you're learning to exploit.

## Ask your agent

> "In this repo, explain what happens today if an API route calls
> executeOperation('op_123'): trace through src/lib/operations/engine.ts and tell me which
> pipeline stages (validators, rate-limiter, approvals, dry-run, queue, audit) are actually
> invoked versus merely existing as stubs. Then propose the order the real engine should
> call them in, and justify the order."

The first half checks whether the agent distinguishes *existing* code from *invoked* code —
a distinction agents (and juniors) blur. The second half is a design conversation: compare
its proposed order against the pipeline diagram at the top of this chapter. If it puts
rate-limiting after approval, ask it why — and decide whether you agree. Arguing with an
agent about design, evidence in hand, is the [Chapter 9](09-ai-assisted-engineering.md)
skill in its purest form.

---

**You can now:** explain the command pattern and registry to another junior with this
repo's files as evidence, place any new safety concern into the right pipeline stage,
say precisely why the worker is a separate process, and spot the difference between a
stub that's promising something and code that's doing something.

**Next:** [Chapter 8 — Domain Services](08-domain-services.md): the two real algorithms in
this codebase (feature flags and severity), and the audit log's anatomy.
