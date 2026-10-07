# Guide: .env.example

> **File:** `.env.example` (project root)
> **Role:** Documents every environment variable the project needs, with safe default values. This file is committed to git. The actual `.env` file (with real values) is not.
>
> **In this snapshot:** `.env.example` itself is not included. The README Quick Start lists its ten variables so you can create `.env` by hand.
>
> **What the code actually reads (checked against this snapshot).** Only two of the ten variables are read by name: `DATABASE_URL` (`src/lib/db/index.ts:6`, which throws `DATABASE_URL is required.` on line 9 when it is missing, and `drizzle.config.ts:8`) and `REDIS_URL` (`worker/index.ts:4`, with a `redis://localhost:6379` fallback). `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are never referenced in this repository's code; whether they matter depends on how `next-auth` 5.0.0-beta.25 itself reads the environment. The other six (`SIMULATE_DATA`, `SIMULATION_INTERVAL_MS`, `READ_MODEL_REFRESH_INTERVAL_MS`, `APPROVAL_EXPIRY_HOURS`, `DEFAULT_RATE_LIMIT_WINDOW_MS`, `LOG_LEVEL`) are not read anywhere. The sections below describe what each variable is *meant* to control; each one now says what the current code does instead.

---

## Purpose

Environment variables are how you configure an application without hardcoding values into the source code. Things like database passwords, API keys, feature flags, and tuning parameters all go here.

But there's a tension: you need to share the *names* of the variables (so teammates know what to set), but you can't share the *values* (because some are secrets). That's where `.env.example` comes in:

- **`.env.example`** -- Committed to git. Contains every variable name with safe placeholder or development values. Acts as documentation.
- **`.env`** -- NOT committed to git (it's in `.gitignore`). Contains your actual values. Each developer copies `.env.example` to `.env` and fills in their own values.

When you first set up the project, you run:

```bash
cp .env.example .env
```

And then edit `.env` as needed. For local development, the defaults in `.env.example` usually work as-is (they match the Docker Compose configuration).

---

## Line-by-Line Walkthrough

### Database Connection

```
DATABASE_URL=postgresql://opsforge:opsforge_dev@localhost:5432/opsforge
```

The connection string for PostgreSQL. Let's decode it:

| Part | Value | Meaning |
|---|---|---|
| Protocol | `postgresql://` | We're connecting to a PostgreSQL database |
| Username | `opsforge` | The database user (matches `POSTGRES_USER` in `docker-compose.yml`) |
| Password | `opsforge_dev` | The password (matches `POSTGRES_PASSWORD` in `docker-compose.yml`) |
| Host | `localhost` | The database is on this machine |
| Port | `5432` | The standard PostgreSQL port |
| Database | `opsforge` | The database name (matches `POSTGRES_DB` in `docker-compose.yml`) |

Notice how these values align with `docker-compose.yml`. The compose file *creates* the database with these credentials; the `.env` file tells the app how to *connect* to it.

If you run the app on your machine and only the database in Docker, `localhost` works because `docker-compose.yml` publishes port 5432 (line 35).

If you run the `app` or `worker` service *inside* Docker (`docker compose up`), it does **not** work. Both services load this same `.env` (`env_file`, lines 8-9 and 20-21), and inside a container `localhost` is the container itself, not the `postgres` or `redis` service. Containers on the compose network reach each other by service name, so those services need `DATABASE_URL=postgresql://opsforge:opsforge_dev@postgres:5432/opsforge` and `REDIS_URL=redis://redis:6379`. One `.env` cannot serve both setups as written; a per-service `environment:` override in `docker-compose.yml` is the usual fix.

### Redis Connection

```
REDIS_URL=redis://localhost:6379
```

Connection string for Redis. Simpler than Postgres because our local Redis has no authentication (no username or password). Port 6379 is the Redis default.

In this code only the worker reads it: `worker/index.ts:4` passes it to `IORedis`, and BullMQ's `Queue` and `Worker` (lines 8-10) share that connection. Like the database URL, this matches what `docker-compose.yml` sets up.

### Authentication

```
NEXTAUTH_SECRET=change-me
NEXTAUTH_URL=http://localhost:3000
```

**`NEXTAUTH_SECRET`** -- A secret key used by NextAuth.js to encrypt session tokens and sign cookies. In production, this must be a long, random string (at least 32 characters). The `change-me` value is obviously not secure -- it's a placeholder reminding you to change it.

To generate a proper secret:

```bash
openssl rand -base64 32
```

**`NEXTAUTH_URL`** -- The canonical URL of your application. NextAuth uses this for generating callback URLs during authentication flows (like OAuth redirects). In development, it's your local server. In production, it would be something like `https://app.example.com`.

### Feature Flags and Simulation

```
SIMULATE_DATA=true
SIMULATION_INTERVAL_MS=60000
```

**`SIMULATE_DATA`** -- Intended to switch on generated fake incidents, operations, and other data so development looks like a live environment. In this snapshot nothing reads it: `runHealthSimulator` (`src/lib/simulators/health-simulator.ts:1-3`) only returns a timestamp, and nothing in `src/` or `worker/` outside `src/lib/simulators/` calls it.

**`SIMULATION_INTERVAL_MS`** -- Intended to say how often (in milliseconds) the simulator creates new data. `60000` ms = 60 seconds = 1 minute. Nothing schedules the simulator yet, so the value has no effect.

The `_MS` suffix convention is good practice. Without it, you'd have to guess whether `60000` means milliseconds, seconds, or something else. Being explicit in variable names prevents bugs.

### Performance Tuning

```
READ_MODEL_REFRESH_INTERVAL_MS=300000
```

**`READ_MODEL_REFRESH_INTERVAL_MS`** -- Intended to say how often the read models (denormalized/cached views of data) are refreshed. `300000` ms = 5 minutes. The refresh functions in `src/lib/db/read-models/` are placeholders today; for example `refreshCustomerSummaryReadModel` (`customer-summary.ts:1-3`) only returns a timestamp, and nothing runs them on an interval.

This suggests the project uses a CQRS-like pattern (Command Query Responsibility Segregation), where writes go to normalized tables and reads come from pre-computed views. The read model doesn't update in real-time; it refreshes at this interval. A shorter interval means more up-to-date reads but more database load. A longer interval means slightly stale reads but less work.

### Business Logic Configuration

```
APPROVAL_EXPIRY_HOURS=24
```

**`APPROVAL_EXPIRY_HOURS`** -- Intended to set how long an approval request remains valid before it expires. `24` hours = 1 day. The schema has an `expiresAt` column (`src/lib/db/schema.ts:362`), but `createApprovalRequest` (`src/lib/approvals/service.ts:1-3`) is a stub that returns `{ operationId, status: "pending" }`, and nothing marks approvals as expired.

This is a business rule expressed as configuration. By putting it in an environment variable (instead of hardcoding `24` somewhere in the code), you can change the policy without redeploying. Want approvals to last a week? Set it to `168`. Want 4 hours? Set it to `4`.

### Rate Limiting

```
DEFAULT_RATE_LIMIT_WINDOW_MS=3600000
```

**`DEFAULT_RATE_LIMIT_WINDOW_MS`** -- Intended as the time window for rate limiting. `3600000` ms = 3600 seconds = 1 hour (for example, "a user can trigger at most N operations per hour"). Today `checkRateLimit` (`src/lib/operations/rate-limiter.ts:1-3`) always returns `{ allowed: true, remaining: 10, ... }`, so there is no window to configure.

Rate limiting prevents abuse and protects your system from being overwhelmed. The window defines the reset period -- counters go back to zero after this duration.

### Logging

```
LOG_LEVEL=info
```

**`LOG_LEVEL`** -- Controls how verbose the application's logging is. Common levels, from most to least verbose:

| Level | What it shows |
|---|---|
| `debug` | Everything, including internal details |
| `info` | Normal operations (startup, requests, jobs completed) |
| `warn` | Potential problems that aren't errors yet |
| `error` | Things that went wrong |

`info` is a sensible default for development. If you're debugging a specific issue, temporarily set it to `debug` for more detail. In production, `warn` or `info` is typical.

In this snapshot there is no logger that reads `LOG_LEVEL`. The one logging switch in the code is `auditLog` (`src/lib/audit/log.ts:19-24`), which prints to the console whenever `NODE_ENV` is not `production`.

---

## Concepts Taught

1. **Configuration via environment variables** -- The [12-factor app](https://12factor.net/config) principle: configuration that varies between environments (dev, staging, production) should come from the environment, not from code.
2. **The `.env.example` pattern** -- Documenting required variables with safe defaults, separate from actual secrets.
3. **Connection string format** -- How database and Redis URLs encode credentials, host, port, and database name into a single string.
4. **Millisecond conventions** -- Using the `_MS` suffix to make time units unambiguous.
5. **Business rules as configuration** -- Making policies like expiry times and rate limits configurable without code changes.
6. **Log levels** -- The hierarchy of logging verbosity and when to use each level.

---

## Common Mistakes

1. **Committing `.env` to git.** This is the number one mistake. Your `.env` file contains secrets (database passwords, auth secrets). It must be in `.gitignore`. If you accidentally commit it, the secret is in the git history forever (even if you delete it in a later commit). You'd need to rotate the credentials.

2. **Forgetting to update `.env.example` when adding a new variable.** If you add `SMTP_HOST` to your `.env` and your code reads it, but you don't add it to `.env.example`, the next developer who sets up the project will get a mysterious error because they don't know the variable exists.

3. **Using `change-me` secrets in production.** `NEXTAUTH_SECRET=change-me` is fine for local development. In production, it's a security vulnerability. Anyone who knows (or guesses) the secret can forge session tokens.

4. **Hardcoding the wrong host.** `localhost` works when the database is on the same machine (or in Docker with port mapping). In a production environment, the database is usually on a different host (like `db.example.com` or an IP address). Make sure `DATABASE_URL` reflects your actual infrastructure.

5. **Confusion about types.** Environment variables are always strings. `SIMULATE_DATA=true` is the *string* `"true"`, not the boolean `true`. Your application code needs to parse it: `process.env.SIMULATE_DATA === "true"`. Similarly, `SIMULATION_INTERVAL_MS=60000` is the string `"60000"`, and you need `parseInt(process.env.SIMULATION_INTERVAL_MS)` or use a validation library like Zod to parse it.

6. **Not matching `.env` values to `docker-compose.yml`.** The database credentials in `.env` must match what `docker-compose.yml` configures. If the compose file creates user `opsforge` with password `opsforge_dev`, but your `.env` says `myuser:mypassword`, the connection will fail.

---

## Mini Exercises

### Exercise 1: Add a New Variable
The app needs an `SMTP_HOST` variable for sending emails. Add it to `.env.example` with a sensible default for local development.

<details>
<summary>Solution</summary>

Add this line to `.env.example`:

```
SMTP_HOST=localhost
```

Or, if you're using a service like Mailhog/Mailpit for local email testing:

```
SMTP_HOST=localhost
SMTP_PORT=1025
```

Then copy the change to your `.env` file too. If you were setting up Mailpit, you'd also add a `mailpit` service to `docker-compose.yml`.
</details>

### Exercise 2: Convert Milliseconds to Human-Readable
Without a calculator, figure out what these durations are in plain English:
- `SIMULATION_INTERVAL_MS=60000`
- `READ_MODEL_REFRESH_INTERVAL_MS=300000`
- `DEFAULT_RATE_LIMIT_WINDOW_MS=3600000`

<details>
<summary>Solution</summary>

The trick: divide by 1000 to get seconds, then by 60 to get minutes, then by 60 to get hours.

- `60000` ms = 60 seconds = **1 minute**
- `300000` ms = 300 seconds = **5 minutes**
- `3600000` ms = 3600 seconds = 60 minutes = **1 hour**
</details>

### Exercise 3: Validate Environment Variables with Zod
The project uses Zod (listed in `package.json`). Write a small Zod schema that validates all the environment variables in `.env.example`. It should parse numbers, booleans, and provide defaults.

<details>
<summary>Solution</summary>

```typescript
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  SIMULATE_DATA: z.string().transform((val) => val === "true").default("false"),
  SIMULATION_INTERVAL_MS: z.coerce.number().positive().default(60000),
  READ_MODEL_REFRESH_INTERVAL_MS: z.coerce.number().positive().default(300000),
  APPROVAL_EXPIRY_HOURS: z.coerce.number().positive().default(24),
  DEFAULT_RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(3600000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse(process.env);
```

This validates all variables at startup and crashes immediately with a clear error if anything is missing or invalid. Much better than getting a cryptic `NaN` error 20 minutes into runtime.
</details>

### Exercise 4: Find Which Variables Are Real
**Goal:** sort the ten variables into "read by this repository's code" and "documented only".
**Check:** `git grep -n "process\.env" -- src worker drizzle.config.ts auth.ts middleware.ts` prints exactly four lines: `DATABASE_URL` twice (`drizzle.config.ts`, `src/lib/db/index.ts`), `NODE_ENV` once (`src/lib/audit/log.ts`) and `REDIS_URL` once (`worker/index.ts`). Your "documented only" list therefore has eight entries, and `NODE_ENV` is a variable the code reads that `.env.example` does not list.

### Exercise 5: Make Docker Compose Reach Its Own Database
**Goal:** let the `app` and `worker` containers connect to Postgres and Redis without breaking the "app on my machine" setup.
**Check:** `docker-compose.yml` gives `app` and `worker` an `environment:` block whose `DATABASE_URL` host is `postgres` and whose `REDIS_URL` host is `redis` (these override the same names from `env_file`), while `.env` keeps `localhost`. With `docker compose up`, the worker logs `OpsForge worker online.` (`worker/index.ts:21`) instead of a Redis connection error.

---

## Further Reading

- [The Twelve-Factor App: Config](https://12factor.net/config) -- The principle behind environment-based configuration.
- [dotenv documentation](https://github.com/motdotla/dotenv) -- The library that loads `.env` files (Next.js has built-in support, but understanding the underlying library is useful).
- [NextAuth.js configuration](https://authjs.dev/getting-started/installation) -- What `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are used for.
- [PostgreSQL connection strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING-URIS) -- Official docs on the URL format.
- [Zod environment validation patterns](https://zod.dev/) -- Using Zod to validate and parse environment variables at startup.
