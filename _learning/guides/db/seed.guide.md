# Guide: Database Seed Script

**Source file:** `src/lib/db/seed.ts`

---

## Purpose

A seed script populates your database with sample data so you have something to work with during development. Instead of manually inserting rows through a database GUI every time you reset your database, you run one command and get a consistent, predictable dataset.

Right now, this file is a **scaffold** -- it sets up the structure for seeding but does not actually insert any data yet. It is a placeholder that shows the pattern for how seed scripts are organized. The comment says "Implement full seed execution in subsequent phases," which is honest: someone wrote the skeleton first and planned to fill it in later.

This is a common and reasonable approach in real projects. You set up the entry point and the error handling first, then add the actual data generation later. It means the `npm run seed` command (or however the script is triggered) works from day one, even if it does not do much yet.

---

## Line-by-Line Walkthrough

```typescript
import { faker } from "@faker-js/faker";
```

Faker is a library that generates realistic fake data: names, emails, addresses, company names, numbers, dates, and much more. It is one of the most popular tools for seeding databases in the JavaScript ecosystem.

The `@faker-js/faker` package is the community-maintained fork. There used to be a package called just `faker` that was sabotaged by its original author in early 2022 (a famous incident in the open-source world). The `@faker-js` scoped package is the safe, actively maintained replacement.

```typescript
async function main() {
```

The seed logic is wrapped in an `async` function. This is important because database operations are asynchronous -- when the actual seed logic is added, it will use `await` to insert rows and wait for each operation to complete. Even though nothing async happens right now, structuring it this way from the start avoids having to refactor later.

```typescript
  faker.seed(42);
```

This is one of the most important lines in any seed script. Setting a seed value makes Faker's random number generator **deterministic**. Every time you run `faker.seed(42)`, Faker will produce the exact same sequence of "random" values.

Why does this matter? Imagine you seed your database, then write a test that checks "the first customer is named Acme Corp." If Faker generated different names every time, your test would be unpredictable. A fixed seed means you get the same data every run, which makes your development environment reproducible and your tests reliable.

The number `42` is arbitrary (it is a famous number in programming, from The Hitchhiker's Guide to the Galaxy). You could use any number. What matters is that it is always the same number.

```typescript
  console.log("OpsForge seed scaffold ready.");
  console.log("Implement full seed execution in subsequent phases.");
```

Simple status messages. When this script runs, it tells you it executed but did not do anything real yet. Good seed scripts should always log what they are doing so you can watch progress and debug issues.

```typescript
}
```

End of the `main` function.

```typescript
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

This is the standard pattern for running an async function at the top level of a Node.js script. Here is what is happening:

1. `main()` is called, which returns a Promise (because the function is `async`).
2. `.catch((error) => { ... })` handles any errors that occur inside `main`.
3. `console.error(error)` prints the full error (including stack trace) to stderr.
4. `process.exit(1)` stops the Node.js process with exit code `1`.

Exit codes are how scripts communicate success or failure to the operating system and to other tools. Exit code `0` means success, and any non-zero code means failure. By exiting with `1` on error, CI/CD pipelines and shell scripts that call this seed script can detect the failure and stop.

If you did not have the `.catch()`, an unhandled promise rejection would cause Node.js to either print a warning or crash (depending on your Node.js version), but it might exit with code `0`, which would make it look like the seed succeeded even though it failed.

---

## Concepts Taught

| Concept | Where it appears |
|---|---|
| **Database seeding** | The entire file's purpose -- generating development data |
| **Deterministic randomness** | `faker.seed(42)` -- reproducible fake data |
| **Scaffold / stub pattern** | The file sets up structure before implementing logic |
| **Async entry point pattern** | `async function main()` with `.catch()` at the bottom |
| **Exit codes** | `process.exit(1)` -- communicating failure to the OS |
| **Faker.js** | Generating realistic fake data for development |

---

## Common Mistakes

1. **Forgetting `faker.seed()`.** Without a seed, you get different data every run. This makes debugging painful because you cannot reproduce the exact state from a previous run. Always seed your random generators in development scripts.

2. **Not handling errors.** If you just call `main()` without `.catch()`, errors inside the async function become "unhandled promise rejections." In older versions of Node.js, these just printed a warning. In newer versions, they crash the process -- but sometimes with an ambiguous exit code. The explicit `.catch()` and `process.exit(1)` pattern is the safe way to handle this.

3. **Seeding in production.** Seed scripts should never run against a production database. A common safeguard is to check `process.env.NODE_ENV` at the top and bail out if it is `"production"`. This script does not have that guard yet -- something to be aware of.

4. **Not clearing old data before seeding.** When the actual seed logic is added, it should probably truncate or delete existing data before inserting new data. Otherwise, running the seed twice would double the data. A common pattern is `DELETE FROM table_name` or `TRUNCATE table_name CASCADE` before each insert block.

5. **Inserting data in the wrong order.** Because of foreign key constraints (a customer references an account, an invoice references a customer, etc.), you need to insert parent rows before child rows. If you try to insert a customer before its account exists, the database will reject it with a foreign key violation.

---

## Mini Exercises

### Exercise 1: Add Real Seed Data for Operators

Import the `db` and `operators` table from the project, then insert 3-5 operator rows using Faker to generate names and emails. Remember to insert them in the `main` function using `await`. Here is a starting point:

```typescript
import { db } from "@/lib/db";
import { operators } from "@/lib/db/schema";

// Inside main():
await db.insert(operators).values({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: "ops_engineer",
  department: faker.commerce.department(),
});
```

### Exercise 2: Add a Production Guard

Add a check at the very top of `main()` that throws an error if `process.env.NODE_ENV === "production"`. This prevents anyone from accidentally running the seed script against a production database.

### Exercise 3: Add Timing

Wrap the seed logic with `console.time("seed")` and `console.timeEnd("seed")` to measure how long seeding takes. This is useful as your seed script grows -- if seeding takes 30 seconds, you probably want to optimize it (batch inserts instead of one-at-a-time, for example).

---

## Further Reading

- **Faker.js documentation:** [fakerjs.dev](https://fakerjs.dev/) has a full list of all the data generators available (names, addresses, dates, finance, lorem, etc.).
- **Drizzle insert syntax:** [Drizzle insert docs](https://orm.drizzle.team/docs/insert) show how to insert single rows, multiple rows, and handle conflicts.
- **Why deterministic seeds matter:** Search for "reproducible test data" or "deterministic testing." The idea applies to more than just database seeding -- it is a general principle in testing.
- **The Faker.js sabotage incident:** If you are curious about the history, search for "faker.js colors.js open source incident." It is an important cautionary tale about open-source sustainability.
- **Process exit codes:** The [Node.js process docs](https://nodejs.org/api/process.html#processexitcode) explain exit codes and `process.exit()`.
