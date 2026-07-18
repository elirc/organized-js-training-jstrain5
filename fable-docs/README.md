# OpsForge Training Docs (fable-docs)

A nine-chapter course that teaches production web engineering using **this actual
codebase** — OpsForge, an internal operations dashboard built with Next.js 14, TypeScript,
Drizzle, and BullMQ. It assumes you know basic JavaScript/React syntax but have never
worked in a production codebase.

These docs replace file-by-file reading with **concept-and-flow chapters**: each one gives
you a mental model, teaches from real files in this repo (all paths are clickable), names
the mistakes juniors actually make, and ends with exercises — because reading informs, but
only doing trains.

> Looking for the old per-file guides? They still live in [`_learning/`](../_learning) and
> remain useful as reference *after* you understand a chapter. The review that shaped this
> set is in [`docs-review.md`](docs-review.md).

## How to read this

- **In order, one chapter per sitting.** Concepts compound; Chapter 7 assumes Chapters 3–5.
- **With the repo open and running.** Do the "Try it yourself" exercises as you hit them —
  several ask you to break things on purpose and watch the failure. That's where the
  learning is. (Setup: `cp .env.example .env`, `npm install`,
  `docker compose up -d postgres redis`, `npm run dev` — details in Chapter 2.)
- **With a coding agent nearby.** Every chapter ends with an "Ask your agent" exercise;
  Chapter 9 is entirely about that workflow.
- **Glossary on the side.** Any wobbling term is in the [Glossary](GLOSSARY.md), linked
  back to the chapter that develops it.

## The path

| # | Chapter | You'll be able to… |
|---|---|---|
| 1 | [The Big Picture](01-big-picture.md) | Trace any request through the layers; read scaffolded code for intent |
| 2 | [Tooling & Config](02-tooling.md) | Set up from a fresh clone; explain why conventions are machine-enforced (CI, lint, strict TS) |
| 3 | [The Data Layer](03-data-layer.md) | Decode any table in the schema; explain pooling, migrations, and honest mock data |
| 4 | [Authentication & Permissions](04-authentication.md) | Trace login end to end; add a role safely; never confuse 401 and 403 again |
| 5 | [The API Layer](05-api-layer.md) | Write an endpoint honoring the envelope + Zod contract; explain cursor pagination |
| 6 | [The UI Layer](06-ui-layer.md) | Decide server vs. client per component; add a page + nav entry the house way |
| 7 | [The Operations Engine](07-operations-engine.md) | Explain the command pattern, registry, queue/worker split, and the safety pipeline |
| 8 | [Domain Services](08-domain-services.md) | Whiteboard deterministic feature rollouts; read classifiers and audit anatomy |
| 9 | [AI-Assisted Engineering](09-ai-assisted-engineering.md) | Use agents to explore, prompt with reference patterns, and review diffs you can own |

Plus: [Glossary](GLOSSARY.md) · [Docs review (how this set was planned)](docs-review.md)

## The threads that run through everything

You'll meet these ideas repeatedly, each time with more depth — that's by design:

- **Layers, one-way dependencies** (Ch. 1 → enforced in every later chapter's review checklist)
- **Validate at the boundary, trust the interior** (Zod in login, Ch. 4 → APIs, Ch. 5 → business preconditions, Ch. 7)
- **Make bad states unrepresentable** (DB enums, Ch. 3 → discriminated unions, Ch. 5 → flag-type critique, Ch. 8)
- **Safe by default** (schema defaults, Ch. 3 → deny-by-default RBAC, Ch. 4 → dry-run-first commands, Ch. 7)
- **Consistency is a feature** (scaffolding, Ch. 1 → predictable stubs, Ch. 7–8 → why agents thrive here, Ch. 9)

## After the course

Capstone, in rough order of difficulty — each uses skills from multiple chapters:

1. Implement a stubbed GET endpoint with real filtering + pagination (Ch. 5).
2. Replace a placeholder page with a real data-backed table (Ch. 5–6).
3. Add an `auditor` role end to end and prove it with two logins (Ch. 4).
4. Add operation command #18 with a meaningful dry-run report (Ch. 7).
5. Plan (with an agent, plan-only) the real `engine.ts` pipeline, then implement one stage
   with audit logging (Ch. 7–9).
