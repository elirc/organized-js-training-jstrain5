# Guide: drizzle.config.ts

> **File:** `drizzle.config.ts` (project root)
> **Role:** Configures Drizzle Kit, the CLI tool that generates and runs database migrations based on your TypeScript schema.

---

## Purpose

Drizzle ORM lets you define your database tables in TypeScript. But your database doesn't read TypeScript -- it speaks SQL. Something needs to bridge the gap. That's Drizzle Kit.

When you change your schema (add a column, create a table, rename a field), Drizzle Kit compares your TypeScript schema to the previous migration files and generates the SQL needed to update the database. This config file tells Drizzle Kit:

1. Where your schema definition lives.
2. Where to store migration files.
3. How to connect to the database.
4. What database dialect you're using.

This is a small file, but every line matters.

---

## Line-by-Line Walkthrough

```typescript
import type { Config } from "drizzle-kit";
```

Type-only import for the Drizzle Kit configuration type. This gives you autocompletion and type-checking for the config object. `import type` means it's stripped out at runtime -- it exists only for TypeScript's benefit.

```typescript
export default {
```

The config is exported as a default export. Drizzle Kit imports this file directly when you run commands like `drizzle-kit generate` or `drizzle-kit migrate`.

```typescript
  schema: "./src/lib/db/schema.ts",
```

**Where is the database schema defined?** This points to the TypeScript file where you define your tables, columns, and relationships using Drizzle's API. When Drizzle Kit generates migrations, it reads this file to understand what your database *should* look like.

This is a single file path, but Drizzle also supports an array of paths or glob patterns (like `"./src/lib/db/schema/*.ts"`) if you split your schema across multiple files. This project keeps everything in one file, which is fine for a moderate-sized schema.

```typescript
  out: "./src/lib/db/migrations",
```

**Where should migration files be saved?** When you run `drizzle-kit generate`, it creates SQL files in this directory. Each migration gets a timestamped folder or file containing the SQL statements needed to update the database.

These migration files should be committed to version control. They're the official record of your database's evolution. Anyone who clones the project can run `drizzle-kit migrate` to build the database from scratch by replaying all migrations in order.

```typescript
  dialect: "postgresql",
```

**What database engine are you using?** Drizzle supports multiple databases (PostgreSQL, MySQL, SQLite). This tells the code generator to produce PostgreSQL-flavored SQL. Column types, syntax quirks, and available features all differ between databases, so getting this right is critical.

This must match what's actually running. Our `docker-compose.yml` runs `postgres:16-alpine`, so `"postgresql"` is correct.

```typescript
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
```

**How does Drizzle Kit connect to the database?** It reads the `DATABASE_URL` environment variable. This is a connection string in the format:

```
postgresql://username:password@host:port/database
```

For our project (from `.env`): `postgresql://opsforge:opsforge_dev@localhost:5432/opsforge`.

The `?? ""` is a nullish coalescing operator -- if `DATABASE_URL` is `undefined` (not set), fall back to an empty string. This prevents a TypeScript error about `process.env.DATABASE_URL` potentially being `undefined`, but it's a bit of a white lie -- Drizzle Kit will fail with an empty string anyway. A more honest approach would be to throw an error:

```typescript
url: process.env.DATABASE_URL ?? (() => { throw new Error("DATABASE_URL is required"); })(),
```

But the current approach works in practice because you'll immediately see a connection error if the variable is missing.

```typescript
  verbose: true,
```

**Show detailed output.** When generating or running migrations, Drizzle Kit will print every SQL statement it's about to execute. This is valuable -- you should always read the generated SQL to make sure it matches your intentions. A small schema change can sometimes produce unexpected SQL (like dropping and recreating a column instead of renaming it).

```typescript
  strict: true,
```

**Ask for confirmation before dangerous operations.** When `strict` is true, Drizzle Kit will prompt you before executing migrations that could lose data (like dropping a column or table). This is a safety net -- it gives you a chance to review before irreversible changes happen.

```typescript
} satisfies Config;
```

**The `satisfies` keyword.** This is a relatively new TypeScript feature (4.9+). It checks that the object matches the `Config` type without changing the object's inferred type. It's similar to the `: Config` annotation on line 2, but `satisfies` is more precise -- it validates the shape while preserving literal types.

In practice, both approaches work here. Using `satisfies` is slightly more idiomatic in modern TypeScript. You'll see it used elsewhere in the codebase too.

---

## Concepts Taught

1. **Database migrations** -- The practice of managing schema changes as versioned, ordered SQL files. Instead of manually running `ALTER TABLE` commands, you generate migration files and apply them systematically.
2. **Schema-first development** -- You define what you want in TypeScript, and the tooling generates the SQL. The TypeScript schema is the source of truth.
3. **Connection strings** -- The `postgresql://user:pass@host:port/db` format for database URLs. Most database libraries and tools understand this format.
4. **Environment variables for credentials** -- Database passwords live in `.env`, not in config files that get committed to git.
5. **The `satisfies` operator** -- A TypeScript feature for type-checking an expression without widening its type.

---

## Common Mistakes

1. **Running `db:generate` without reviewing the output.** Drizzle Kit generates SQL, but it doesn't always do what you expect. If you rename a column, it might generate a "drop old column, add new column" instead of a proper rename -- and that loses data. Always read the generated SQL files before running `db:migrate`.

2. **Forgetting to set `DATABASE_URL`.** If you run Drizzle Kit commands without the environment variable set (or without a `.env` file), you get a cryptic connection error. Make sure your `.env` file exists and has the correct URL.

3. **Editing migration files after they've been applied.** Once a migration has been run against a database, changing it creates a mismatch between what the database has and what the migration file says. If you need to fix something, generate a *new* migration instead.

4. **Not committing migration files.** The files in `src/lib/db/migrations/` must be in version control. They're the history of your database schema. Without them, a teammate can't set up their database, and your CI/CD pipeline can't deploy.

5. **Confusing `drizzle-orm` and `drizzle-kit`.** `drizzle-orm` is the runtime library your app uses to query the database. `drizzle-kit` is the CLI tool for managing migrations. They're separate packages with separate concerns. This config file is for `drizzle-kit` only.

---

## Mini Exercises

### Exercise 1: Trace the Schema Path
Open the file at `./src/lib/db/schema.ts` (the path referenced by this config). Find at least one table definition. What columns does it have? What types are they?

<details>
<summary>Hint</summary>

Look for calls to `pgTable()` in the schema file. Each table definition lists columns with their types: `text()`, `integer()`, `boolean()`, `timestamp()`, etc. These TypeScript types map directly to PostgreSQL column types.
</details>

### Exercise 2: Inspect a Migration File
Look inside `./src/lib/db/migrations/`. Open one of the generated SQL files. Can you match the SQL statements to the schema definitions in `schema.ts`?

<details>
<summary>Hint</summary>

The migration files contain raw SQL like `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`. Each one corresponds to a change that was made in the schema file and then generated by `drizzle-kit generate`.
</details>

### Exercise 3: What Happens Without `strict`?
Temporarily remove or set `strict: false` in the config. Add a column to a table in `schema.ts`, then run `npm run db:generate`. Now change the column name (simulating a rename). Run `npm run db:generate` again. Look at the generated SQL -- did it rename the column, or did it drop and recreate it? (Don't apply the migration -- just inspect the SQL.)

<details>
<summary>Solution</summary>

With `strict: false`, Drizzle Kit won't prompt you about destructive operations. The generated SQL will likely show a `DROP COLUMN` followed by `ADD COLUMN` instead of a proper `ALTER COLUMN RENAME`. This is exactly the kind of situation where reviewing the SQL and having `strict: true` saves you from data loss. Revert your changes when done.
</details>

---

## Further Reading

- [Drizzle Kit documentation](https://orm.drizzle.team/kit-docs/overview) -- Official docs on configuration, generation, and migration.
- [Drizzle ORM schema declaration](https://orm.drizzle.team/docs/sql-schema-declaration) -- How to define tables and columns in TypeScript.
- [Database migrations explained](https://en.wikipedia.org/wiki/Schema_migration) -- The general concept, not specific to Drizzle.
- [PostgreSQL connection strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING) -- The official spec for connection URL format.
- [TypeScript `satisfies` operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator) -- The TypeScript 4.9 feature used at the end of this file.
