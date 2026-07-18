# Docs Review — `_learning/` (65 documents)

Reviewed: 4 top-level docs + 61 per-file guides. Every guide follows the same template
(Purpose → Line-by-Line Walkthrough → Concepts Taught → Common Mistakes → Mini Exercises →
Further Reading), and the per-document quality is genuinely high: real code excerpts, honest
"this is a stub" callouts, exercises with hidden solutions.

## What the existing docs do well

- **Teach from real code.** Almost every guide quotes the actual file and annotates it, rather
  than describing it abstractly.
- **Honesty sections.** Domain guides include "Honesty About Code Quality" — they call out the
  `never[]` inference trap, the flawed `FeatureFlag` type design, hardcoded passwords. That is
  rare and valuable.
- **Exercises exist already.** Every guide has 2–3 Mini Exercises, many with solutions.
- **Plain-language glossary** with code examples from this repo for every entry.

## What is broken at the set level

1. **The unit of organization is the file, not the concept.** Auth is spread across 7 guides;
   a junior reading them in order never sees the login flow as one story. Operations is 8 guides;
   the command-pattern payoff (registry → engine → worker) is described but never *traced*.
   Per-file guides are reference-shaped. Learning needs flow-shaped chapters.
2. **61 stops is not a path, it's a backlog.** The learning path is a table of 61 links. A junior
   cannot hold that; completion rates on a list like that are near zero. Ten chapters is a path.
3. **Stub files get full-length guides.** `dry-run.ts` is 8 lines of placeholder; its guide is
   244 lines. Rollback, validators, rate-limiter, read-models, the three services, scaffolded
   routes, placeholder pages — each re-explains "this is scaffolding, here's what it will become."
   That's the *same lesson* taught ~10 times. It should be taught once, well.
4. **Docs don't reference each other.** Each guide is self-contained; concepts never compound.
   Nothing says "you saw this pattern in the envelope — here's why it pays off again in RBAC."
5. **Missing entirely:**
   - Working with AI coding agents (nothing at all).
   - The invisible professional context: why CI exists, what code review checks, why conventions
     are enforced by machines instead of memos.
   - Cross-layer trace exercises during the chapters (there are 5 good ones, but buried at the
     very end of the learning path where nobody arrives).
   - Glossary entries don't link back to the chapter that develops the term.

## Per-doc verdicts

**Verdict key** — *keep*: content survives largely intact into the new set. *expand*: survives
and gets deeper treatment. *merge*: content is good but folds into a topic chapter. *cut*:
drop; the payload is duplicated elsewhere or the source file is too thin to carry a doc.

### Top-level docs

| Doc | Verdict | Reasoning |
|---|---|---|
| `00-ARCHITECTURE.md` | **keep** (→ ch. 1) | The strongest doc: diagram, lifecycle trace, design decisions, honesty table. Becomes the backbone of the Big Picture chapter, plus a hands-on trace exercise it currently lacks. |
| `01-LEARNING-PATH.md` | **merge** (→ README) | 61 stops is unwalkable. Its chapter structure and checkpoints are good — they become the 9-chapter index. Its final-project exercises move *into* the chapters they belong to. |
| `02-GLOSSARY.md` | **keep + expand** | Best-in-class glossary. Add: links from each term to the chapter that develops it, plus missing professional-context terms (CI, code review, PR, migration). |
| `03-PATTERNS.md` | **merge** (→ chapters) | Good content, wrong location. A patterns catalog separated from the code it describes gets skimmed once and forgotten. Each pattern moves into the chapter where the reader meets the code (envelope → API ch., command/registry → operations ch., anti-patterns → the chapter of the file they live in). |

### Config guides (6) — merge into ch. 2 "Tooling"

| Doc | Verdict | Reasoning |
|---|---|---|
| `config/package-json.guide.md` | merge | Solid, but a junior needs scripts + deps-vs-devDeps, not 230 lines; dependency tour compresses to a table. |
| `config/tsconfig.guide.md` | merge | `strict`, `noEmit`, `paths` are the load-bearing ideas; the rest is reference the official docs already own. |
| `config/tailwind-config.guide.md` | merge | Content scanning + theme extension is one section, not a chapter. |
| `config/docker-compose.guide.md` | merge | The 4-service mental model matters; per-line YAML walkthrough doesn't. |
| `config/drizzle-config.guide.md` | merge | One paragraph of purpose + the migration workflow diagram; workflow already duplicated in architecture doc. |
| `config/env-example.guide.md` | merge | The `.env` vs `.env.example` split is one crisp section; keep the secrets-never-in-git lesson. |

### App/pages guides (8) — merge into ch. 6 "UI Layer"

| Doc | Verdict | Reasoning |
|---|---|---|
| `app/globals-css.guide.md` | merge | CSS variables + dark mode is one section of the UI chapter. |
| `app/utils.guide.md` | merge | `cn()` is 4 lines; teach it inline where the nav component uses it. |
| `app/root-layout.guide.md` | merge | Nested-layout mental model survives; line-by-line HTML walkthrough doesn't. |
| `app/root-page.guide.md` | **cut** | A 116-line guide for a 5-line redirect. One sentence in the routing section covers it. |
| `app/login-page.guide.md` | **expand** (in ch. 4) | The best "real-world React" file in the repo — but it belongs in the *auth* chapter as the start of the login trace, not filed under pages. |
| `app/app-layout.guide.md` | merge | Session check + shell layout — key beats survive in both auth and UI chapters. |
| `app/dashboard-page.guide.md` | merge | The map-over-data pattern; folds into UI chapter with the KPI card. |
| `app/placeholder-pages.guide.md` | merge (→ ch. 1) | Scaffolding-as-strategy is taught once, in the Big Picture chapter, alongside stub routes. |

### API guides (6) — merge into ch. 5 "API Layer"

| Doc | Verdict | Reasoning |
|---|---|---|
| `http/envelope.guide.md` | **expand** | Cornerstone convention of the whole repo; deserves the deepest "why" treatment (it's the pattern juniors and agents must copy). |
| `api/auth-route.guide.md` | merge | Two-line file; the catch-all route idea is one section. |
| `api/dashboard-routes.guide.md` | merge | Simplest real routes — become the "hello world" of the API chapter. |
| `api/customers-route.guide.md` | **expand** | The single best teaching file in the repo (validation, filtering, cursor pagination). Gets the full annotated treatment. |
| `api/customer-detail-route.guide.md` | merge | Dynamic params + the mutation anti-pattern; folds in right after the list route. |
| `api/events-stream.guide.md` | merge | SSE is interesting but peripheral; compressed section with a pointer to run it live. |
| `api/scaffolded-routes.guide.md` | merge (→ ch. 1) | The 501-vs-404 lesson is excellent — it moves to the scaffolding section where it's taught once. |

### Auth guides (7 incl. root + types) — merge into ch. 4 "Authentication & Permissions"

| Doc | Verdict | Reasoning |
|---|---|---|
| `auth/operators.guide.md` | merge | Hardcoded users + the "shortcut vs best practice" lesson survive as the trace's first stop. |
| `auth/rbac.guide.md` | **expand** | The permission model is the most transferable skill here; gets the deep treatment plus the derive-types-from-data pattern. |
| `auth/config.guide.md` | **expand** | The densest real file (Zod, callbacks, `satisfies`); the JWT → session data flow is the heart of the chapter. |
| `root/auth.guide.md` | merge | 4-line file; one section on the entry-point convention. |
| `auth/middleware.guide.md` | merge | `requirePermission` is the authorization enforcement point; one focused section. |
| `types/next-auth-d.guide.md` | merge | Module augmentation folds in where the reader first hits `session.user.role`. |
| `root/middleware.guide.md` | merge | The bouncer mental model survives; taught as the request's first stop in the trace. |

### Component guides (4) — merge into ch. 6 "UI Layer"

| Doc | Verdict | Reasoning |
|---|---|---|
| `components/kpi-card.guide.md` | merge | Perfect first component; becomes the chapter's opening example. |
| `components/opsforge-nav.guide.md` | **expand** | Best component in the repo (client component, data-driven render, active-link detection, `cn()`); full annotation. |
| `components/app-header.guide.md` | merge | Sticky positioning + a11y notes compress to a section. |
| `components/placeholder-view.guide.md` | merge (→ ch. 1) | Joins the single scaffolding lesson. |

### Data guides (6) — merge into ch. 3 "Data Layer"

| Doc | Verdict | Reasoning |
|---|---|---|
| `db/schema.guide.md` | **expand** (selectively) | 936 lines walking all 20+ tables is exhaustive, not teachable. New treatment: deep-dive 3 representative tables (operators, customers, operations) and teach the *reading skills* to decode the rest. |
| `db/index.guide.md` | merge | `server-only` + connection pool are two crisp sections. |
| `db/seed.guide.md` | merge | Stub; one section on what seeding is for. |
| `db/read-models.guide.md` | merge | Stub trio; the read-model concept is one section. |
| `mock/customers.guide.md` | merge | Mock-data-as-contract idea survives; the types get taught with the API chapter that validates against them. |
| `mock/dashboard.guide.md` | merge | Same lesson as mock/customers; folds into one mock-data section. |

### Operations guides (8) — merge into ch. 7 "Operations Engine"

| Doc | Verdict | Reasoning |
|---|---|---|
| `operations/commands-base.guide.md` | merge | The contract type opens the chapter. |
| `operations/commands-registry.guide.md` | merge | Registry pattern, taught against the base type. |
| `operations/commands-example.guide.md` | merge | "One pattern, 17 files" is the right insight; keep it compact. |
| `operations/engine.guide.md` | merge | 3-line stub; its *intended* pipeline becomes the chapter's spine. |
| `operations/dry-run.guide.md` | merge | Blockers-vs-warnings survives as a section; 244 lines for an 8-line stub does not. |
| `operations/rollback.guide.md` | merge | Reversibility discussion compresses to a section. |
| `operations/validators.guide.md` | merge | One section; the boundary-validation lesson already lives in the API chapter. |
| `operations/rate-limiter.guide.md` | merge | Operational-vs-API rate limiting is one good section. |

### Domain guides (11) — merge into ch. 8 "Domain Services"

| Doc | Verdict | Reasoning |
|---|---|---|
| `feature-flags/rollout.guide.md` | **expand** | Real algorithm (hash-to-bucket); one of two places a junior can study actual logic. |
| `feature-flags/evaluator.guide.md` | **expand** | Real evaluation logic with AND/OR rule semantics; the chapter's centerpiece. |
| `feature-flags/service.guide.md` | merge | Stub; one paragraph on the service-boundary idea. |
| `incidents/severity.guide.md` | merge | Real 4-line classifier; compact section with a threshold-tuning exercise. |
| `incidents/impact.guide.md` | merge | One-line estimator; the "fast rough number beats slow precise one" lesson survives. |
| `incidents/service.guide.md` | merge | Stub; covered by the shared service-stub section. |
| `approvals/policies.guide.md` | merge | Real 1-line policy; great for a "find the loophole" exercise. |
| `approvals/service.guide.md` | merge | Stub. |
| `approvals/notifications.guide.md` | merge | Stub; the "notifications are the weak link" insight survives as a callout. |
| `runbooks/templates.guide.md` | merge | Data-as-configuration in one section. |
| `runbooks/service.guide.md` / `executor.guide.md` | merge | Stubs; covered by the shared pattern. |
| `audit/log.guide.md` | **expand** | The `AuditLogInput` type is a spec for a production audit system; deserves real depth (who/what/when/where + danger levels). |

### Infrastructure guides (2) — merge into ch. 7

| Doc | Verdict | Reasoning |
|---|---|---|
| `worker/index.guide.md` | merge | Producer-consumer is the payoff of the operations chapter; taught as the pipeline's last stage. |
| `simulators/overview.guide.md` | merge | Stub trio; one section on why simulators exist. |

## Plan for the new set (not a 1:1 rewrite)

65 docs → **11 files** in `fable-docs/`, organized by *concept and flow* instead of by file:

| New doc | Built from | New in this version |
|---|---|---|
| `README.md` | 01-LEARNING-PATH | 9-chapter path, per-chapter "you can now…" outcomes, how-to-read-this guidance |
| `01-big-picture.md` | 00-ARCHITECTURE + scaffolding guides | The one scaffolding lesson (501s, placeholders, stubs); full request trace as a *do-it* exercise |
| `02-tooling.md` | 6 config guides | Why conventions are machine-enforced (lint/CI/review — the invisible context) |
| `03-data-layer.md` | 6 db/mock guides | Schema *reading skills* over exhaustive table tour |
| `04-authentication.md` | 7 auth guides | One end-to-end login trace across all seven files |
| `05-api-layer.md` | 6 api guides + envelope | Envelope as the repo's #1 convention; contract thinking |
| `06-ui-layer.md` | 8 app + 4 component guides | Server/client boundary as the organizing idea |
| `07-operations-engine.md` | 8 operations guides + worker | The intended pipeline as the spine; stubs taught once |
| `08-domain-services.md` | 11 domain guides | Real logic (flags, severity, audit) foregrounded; stubs batched |
| `09-ai-assisted-engineering.md` | *(new)* | Working with coding agents in this repo |
| `GLOSSARY.md` | 02-GLOSSARY | Terms link back to the chapter that develops them |

Every chapter gets: a mental model up front, why-before-what for each convention, annotated
excerpts from real files with clickable paths, **Common junior mistakes**, **Try it yourself**
(break/trace/predict exercises against this codebase), and an **Ask your agent** exercise.

The original `_learning/` guides stay where they are — they remain useful as per-file reference
after a chapter is understood. The new set links to them where deeper file-level detail exists.
