# Guide: Database Connection Setup

**Source file:** `src/lib/db/index.ts`

---

## Purpose

This file is the single point of entry for talking to the database. Every time your application needs to read from or write to PostgreSQL, it goes through the `db` object exported here. The file does three things:

1. Makes sure this code only ever runs on the server (never in a browser).
2. Creates a connection pool to PostgreSQL.
3. Wraps that pool with Drizzle ORM so you can write type-safe queries.

Think of it as the "front door" to your database. Every other file in the project that needs the database imports `db` from this file.

---

## Line-by-Line Walkthrough

```typescript
import "server-only";
```

This is a Next.js convention. The `server-only` package does not export any code. It exists solely as a build-time guard: if any client-side bundle accidentally tries to import this file, the build will fail with a clear error message. Without this line, you could accidentally leak your database connection string into the browser JavaScript -- a serious security problem.

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
```

Drizzle ORM is a lightweight TypeScript ORM (Object-Relational Mapper). It lets you write database queries in TypeScript instead of raw SQL strings. The `drizzle-orm/node-postgres` import tells Drizzle to use the `node-postgres` (`pg`) driver under the hood. Drizzle supports many drivers (MySQL, SQLite, etc.), and this line picks the PostgreSQL one.

```typescript
import { Pool } from "pg";
```

`pg` (also called `node-postgres`) is the most widely-used PostgreSQL client for Node.js. `Pool` is a connection pool -- more on that below.

```typescript
import * as schema from "@/lib/db/schema";
```

This imports every table and enum definition from the schema file. The `* as schema` syntax bundles them all into a single `schema` object. Passing this to Drizzle is what makes the relational query API work -- Drizzle needs to know about your table shapes to give you type inference and autocompletion.

The `@/` prefix is a path alias configured in `tsconfig.json` that points to the project root. So `@/lib/db/schema` resolves to `src/lib/db/schema.ts`.

```typescript
const connectionString = process.env.DATABASE_URL;
```

`process.env` gives you access to environment variables -- key-value pairs set outside your code (usually in a `.env` file or in your hosting platform's settings). `DATABASE_URL` is a standard convention for database connection strings. A typical value looks like:

```
postgresql://username:password@localhost:5432/opsforge_dev
```

Note that `connectionString` is `const` even though it could be `undefined`. This is fine because we handle that case on the very next line.

```typescript
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}
```

This is a "fail fast" pattern. If someone forgets to set the environment variable, the app crashes immediately at startup with a clear error message, instead of crashing later with a confusing "undefined is not a valid connection string" error deep in the pg driver. Fail-fast checks like this save a lot of debugging time.

```typescript
const pool = new Pool({
  connectionString,
  max: 20,
});
```

A **connection pool** is one of the most important concepts in backend development. Here is why it exists:

- Opening a new database connection is expensive (TCP handshake, SSL negotiation, authentication). This takes 20-100ms each time.
- If you open a new connection for every request, a busy server handling 200 requests/second would be constantly opening and closing connections, wasting time and overwhelming the database.
- A pool keeps a set of connections open and reuses them. When your code needs a connection, it "borrows" one from the pool. When the query finishes, the connection goes back to the pool instead of being closed.

`max: 20` means the pool will hold up to 20 simultaneous connections. If all 20 are in use and a 21st request arrives, it waits in a queue until one frees up. The number 20 is a reasonable default for a development/small production setup. In production, you would tune this based on your database server's capacity and your expected traffic.

`connectionString` uses JavaScript's shorthand property syntax -- `{ connectionString }` is equivalent to `{ connectionString: connectionString }`.

```typescript
export const db = drizzle(pool, { schema });
```

This creates the Drizzle ORM instance. You pass it the pool (so Drizzle knows how to talk to PostgreSQL) and the schema (so Drizzle knows your table shapes). The resulting `db` object is what you use everywhere else in the codebase to run queries like `db.select().from(customers)`.

```typescript
export { pool };
```

The raw pool is also exported. This is less commonly used, but sometimes you need direct access to it -- for example, to run raw SQL queries that Drizzle does not support, to check pool statistics, or to gracefully shut down the pool when the server stops.

---

## Concepts Taught

| Concept | Where it appears |
|---|---|
| **Server-only code** | `import "server-only"` -- preventing sensitive code from reaching the browser |
| **Environment variables** | `process.env.DATABASE_URL` -- keeping secrets out of source code |
| **Fail-fast validation** | The `if (!connectionString)` guard |
| **Connection pooling** | `new Pool(...)` -- reusing expensive database connections |
| **ORM setup** | `drizzle(pool, { schema })` -- bridging TypeScript and SQL |
| **Path aliases** | `@/lib/db/schema` -- cleaner imports via tsconfig |
| **Barrel exports** | This file re-exports `db` and `pool` so other files have a single import target |

---

## Common Mistakes

1. **Forgetting `server-only`.** Without it, Next.js might bundle this file into client-side code. Your database URL would then be visible in the browser's JavaScript. Always guard database files with `server-only`.

2. **Hardcoding the connection string.** Never write `const connectionString = "postgresql://user:pass@localhost/mydb"`. Hardcoded credentials end up in version control, which means anyone who can see your repo can access your database. Always use environment variables.

3. **Setting `max` too high.** If you set `max: 200` but your PostgreSQL instance only supports 100 connections (the default), you will get connection errors. The pool's `max` should always be less than your database's `max_connections` setting, especially when you have multiple application instances sharing the same database.

4. **Creating multiple pools.** If you accidentally create a second pool (for example by putting this code inside a function that gets called repeatedly), you waste connections and can exhaust the database. This file uses module-level `const` so the pool is created exactly once when the module is first imported. Node.js caches module imports, so subsequent `import { db } from "@/lib/db"` calls reuse the same instance.

5. **Not handling the missing env var.** Without the `throw new Error(...)` check, the app would start up and then crash with a cryptic error the first time it tried to query. Fail-fast is always better.

---

## Mini Exercises

### Exercise 1: Add a Connection Timeout

The `Pool` constructor accepts more options than just `connectionString` and `max`. Add an `idleTimeoutMillis` option set to `30000` (30 seconds). This will close idle connections after 30 seconds of inactivity. Look at the [node-postgres Pool documentation](https://node-postgres.com/apis/pool) to see what other options are available.

### Exercise 2: Log When the Pool Connects

Add an event listener to the pool that logs a message every time a new client connects to the database. The `pg` Pool emits a `"connect"` event. Try:

```typescript
pool.on("connect", () => {
  console.log("New database client connected");
});
```

Then think about why you might want to remove or disable this in production (hint: it would fire on every new connection and flood your logs).

### Exercise 3: Add a Health Check Function

Export a function called `checkDatabaseHealth` that runs `SELECT 1` against the pool and returns `true` if it succeeds or `false` if it fails. You would use `pool.query("SELECT 1")` for this. This kind of function is commonly used in health check endpoints (`/api/health`) that load balancers call to see if your app is alive.

---

## Further Reading

- **Connection pooling in depth:** The [node-postgres pooling documentation](https://node-postgres.com/features/pooling) explains how pools work, how to tune them, and how to handle errors.
- **Drizzle ORM overview:** [Drizzle's getting started guide](https://orm.drizzle.team/docs/overview) walks through the full setup and query API.
- **Environment variables in Next.js:** The [Next.js environment variables docs](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables) explain `.env` files, `NEXT_PUBLIC_` prefixes, and when variables are available.
- **Why ORMs exist:** If you are wondering whether you should use raw SQL or an ORM, search for "ORM vs raw SQL tradeoffs." Drizzle sits in an interesting middle ground -- it is closer to SQL than most ORMs (like Prisma), which makes it easier to reason about the actual queries being run.
- **The `server-only` package:** The [Next.js server-only docs](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment) explain why this exists and when to use it.
