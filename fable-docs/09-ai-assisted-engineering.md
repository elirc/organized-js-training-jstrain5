# Chapter 9 — AI-Assisted Engineering: Working With Coding Agents

> **Mental model:** a coding agent is a fast, tireless, well-read pair programmer with no
> memory of your team and no stake in the outcome. Everything it produces is a *proposal*.
> Your job doesn't shrink — it moves up a level: from typing code to specifying, reviewing,
> and verifying it. The engineer who merges the diff owns the diff.

This chapter is practical and specific to this repo. Every technique here uses OpsForge
files you studied in Chapters 1–8 — that's deliberate, because the knowledge you built is
exactly what makes agent output checkable.

## Why this codebase is unusually agent-friendly

Agents are pattern-completion machines: they are most reliable when the codebase gives them
one obvious pattern to complete, and least reliable when every file does things differently.
OpsForge was built — as you now know — on enforced consistency:

- **One API pattern.** Every route uses the envelope + Zod
  ([Chapter 5](05-api-layer.md)). An agent asked for a new endpoint has ~40 examples
  pointing the same direction; deviation shows up in a diff like a wrong-colored brick.
- **Machine-enforced conventions.** `strict` TypeScript, ESLint, the `server-only`
  tripwire ([Chapter 2](02-tooling.md)). Agent output that violates them *fails loudly at
  build time* instead of sneaking into review. Lint rules are guardrails for agents
  exactly as they are for juniors.
- **Domain folders and one command pattern.** "Where does this code go?" has a single
  answer ([Chapter 1](01-big-picture.md), [Chapter 7](07-operations-engine.md)). Agents,
  like new hires, put code in the wrong place when the codebase itself is undecided.

The general lesson for your career: **conventions you enforce for humans pay double for
agents.** A team that tolerates three ways of doing everything gets agent output in a
random fourth way.

## Technique 1 — Explore before you write

The highest-value, lowest-risk agent use is *reading*, not writing. Before touching
unfamiliar code, ask for a trace:

> "Trace what happens in this repo when a logged-in support user PATCHes
> /api/customers/cus_003 with { status: 'active' }. List every file involved in order, and
> flag anything that wouldn't survive a server restart."

A good answer walks middleware → route → Zod → the `Object.assign` mock mutation, and flags
the restart problem you learned in [Chapter 5](05-api-layer.md). You *know* the right
answer here — which is the point of practicing on this repo: you're calibrating how much to
trust traces before you rely on one in a codebase where you can't check.

Use exploration prompts for: "where is X decided?", "what breaks if I rename Y?", "list
every caller of Z." Agents are dramatically better at exhaustive search than humans, and
the failure mode (a wrong claim about code) is cheap to catch by opening the file.

## Technique 2 — Prompt with the repo's conventions, not from scratch

The weakest prompt names the goal. A strong prompt names the goal, the **reference
pattern**, and the **boundary**:

| Weak | Strong |
|---|---|
| "Add an incidents API endpoint" | "Implement GET /api/incidents following the exact pattern of `src/app/api/customers/route.ts`: Zod query schema, envelope responses via `ok`/`fail`, cursor pagination, enums matching `schema.ts`. Don't modify any existing file." |
| "Add a new role" | "Following `src/lib/auth/rbac.ts`'s pattern, add a `billing_admin` role = finance + operations.approve. Touch only rbac.ts and operators.ts." |
| "Fix the login bug" | "Login shows role `undefined` in the header after sign-in. The role flows authorize → jwt callback → session callback (`src/lib/auth/config.ts`). Find where the chain breaks and fix only that." |

Three habits inside those prompts, each earned in an earlier chapter:

1. **Point at a reference file.** "Follow the exact pattern of X" replaces a page of
   requirements with the codebase's own ground truth. You used this in Chapter 5's
   exercise; it's the single biggest quality lever.
2. **State the boundary.** "Don't touch other files" / "touch only these two." Unbounded
   agents helpfully refactor things you didn't ask about, turning a reviewable diff into
   an unreviewable one.
3. **Give the data path, not just the symptom,** when debugging. You know the JWT chain
   from [Chapter 4](04-authentication.md); handing it to the agent turns a fishing trip
   into a targeted search.

## Technique 3 — Review the diff like a reviewer, not a spectator

Never merge output you can't explain line by line. Concretely, for every agent diff in this
repo, run this checklist — it's just Chapters 1–8 compressed:

- **Layering:** does new code live in the right layer, dependencies pointing down?
  (Ch. 1) No `lib/` importing components, no fetch-in-component?
- **Contract:** every API response enveloped, correct HTTP status per branch, Zod at the
  boundary? (Ch. 5)
- **Boundary honesty:** server/client split right — no gratuitous `"use client"`, nothing
  importing DB code into client components? (Ch. 3, 6)
- **Conventions:** `@/` imports, existing helpers reused (`cn`, `ok`/`fail`,
  `requirePermission`) instead of re-invented? Reinvention is the #1 agent smell —
  agents trained on a million repos will happily write a second `classNames` helper.
- **Security defaults:** deny-by-default, no permission checks removed, no secret
  hardcoded? (Ch. 4)
- **Reality check:** do commands it claims to have run (`npm run lint`, tests) actually
  exist in `package.json`? Agents sometimes assert verification they didn't do. Re-run it
  yourself.

Then *run the code*. A diff that reads well and behaves wrong is still wrong; `npm run
dev`, hit the endpoint with curl like you did in Chapter 5's exercises, watch it work.

## Technique 4 — Know what agents are bad at (here, specifically)

- **Stub vs. real.** This repo's biggest trap: an agent may "call" `checkRateLimit` and
  report rate limiting implemented — but you know from [Chapter 7](07-operations-engine.md)
  it always returns `allowed: true`. Agents pattern-match on names; you verify behavior.
- **Cross-process reasoning.** Web vs. worker being separate processes (Ch. 1, 2, 7) is
  exactly the kind of runtime fact agents forget mid-task — they'll share a Map between an
  API route and the worker without blinking.
- **The current phase.** An agent may "improve" scaffolding by implementing it — 400 lines
  of speculative engine logic when you asked for a one-line fix. Boundaries in prompts
  (Technique 2) are the antidote.
- **Your team's unwritten context.** Why `next` is version-pinned, why the login page is
  deliberately un-themed — decisions living in heads or in these docs, not in code. Feed
  that context into prompts, or the agent will "fix" deliberate choices.

## The professional norm

At a real job, "the AI wrote it" explains nothing and excuses nothing — review comments,
outages, and postmortems land on the human who merged. So the standard is simple, and it's
the same standard this whole doc set has been building toward: **merge only what you could
have written slower yourself, and can defend line by line in review.** Agents change the
economics of *producing* code; they change nothing about *owning* it.

Used that way, the payoff is real: exploration in seconds instead of hours, boilerplate
that follows house style, a tireless reviewer for your own diffs ("what did I miss?"), and
more of your attention on the parts that actually need a human — naming, boundaries,
trade-offs, and whether the thing should be built at all.

## Try it yourself

1. **Calibration round.** Ask an agent the Chapter 1 trace question ("what happens when an
   unauthenticated user requests /billing?"). Grade its answer against the chapter. Note
   what it nailed and what it fudged — that's your personal baseline for trust.
2. **The stub trap, live.** Ask an agent: "Does this repo enforce rate limits on
   operations?" A weak answer says yes (the file exists!). A strong answer says the
   function exists but always allows. Whichever you get, you'll remember the lesson.
3. **Boundary discipline.** Give an agent Chapter 4's `billing_admin` task *without* the
   "touch only these files" constraint, and once *with* it. Diff the diffs. Feel the
   difference in reviewability.
4. **Review a deliberately-flawed diff.** Ask an agent to add an endpoint but *omit* the
   reference-file instruction. Review its output with the Technique-3 checklist and write
   the review comments as if for a teammate. (Frequently it invents its own response shape
   — exactly the drift the envelope exists to prevent.)

## Ask your agent (meta-edition)

> "Read fable-docs/ in this repo. Then propose the implementation plan for making
> src/lib/operations/engine.ts real: which stages from Chapter 7's pipeline, in what
> order, touching which existing files. Do not write code — plan only."

You're practicing the senior workflow: agent drafts the plan, you interrogate the plan,
code comes last. If its plan skips the audit log or forgets the idempotency key, you'll
catch it — because you read Chapters 3 and 7. That's the whole loop closed: the docs made
the codebase legible to you, and you make the agent accountable to the codebase.

---

**You can now:** use an agent to explore and trace before writing, prompt with reference
patterns and boundaries, review agent diffs against this repo's conventions, and state the
ownership norm you'll be held to at work.

**Next:** the [Glossary](GLOSSARY.md) whenever a term wobbles — every entry links back to
the chapter that develops it.
