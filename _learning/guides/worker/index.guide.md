# Guide: worker/index.ts

## Purpose

Not everything in a web application should happen while the user waits. Sending an email, generating a report, syncing data with a third-party API -- these are slow operations that would make your app feel sluggish if you did them inside a normal request/response cycle. The solution is a **background worker**: a separate process that picks jobs off a queue and processes them independently from the web server.

This file is the entry point for the project's background worker. It uses **BullMQ** (a popular Node.js job queue library) backed by **Redis** (an in-memory data store) to manage a queue of jobs. Right now the worker is a skeleton -- it logs that it processed a job and returns a timestamp. That is intentional scaffolding. The infrastructure (queue, worker, Redis connection) is the hard part to set up; the actual job logic gets filled in later as features are built.

This file runs as its own Node.js process, completely separate from the Next.js web server. You would start it with something like `npx ts-node worker/index.ts` or a similar command in your deployment setup.

---

## Line-by-Line Walkthrough

### Imports

```typescript
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
```

Two libraries at play here:

- **bullmq** provides `Queue` (for adding jobs) and `Worker` (for consuming jobs). BullMQ is the successor to the original Bull library. It handles retry logic, delayed jobs, rate limiting, concurrency, and other things you absolutely do not want to build yourself.
- **ioredis** is a Redis client for Node.js. Redis is the backbone here -- it is where the queue physically stores its jobs. Think of Redis as a super-fast notepad that both the web server and the worker can read from and write to.

### Establishing the Redis connection

```typescript
const redisConnection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
```

This creates a connection to Redis. Let's break down the arguments:

- `process.env.REDIS_URL ?? "redis://localhost:6379"` -- it tries to read the Redis URL from an environment variable first. If that is not set (like in local development), it falls back to the default Redis address. The `??` is the nullish coalescing operator: it uses the right side only if the left side is `null` or `undefined`.
- `{ maxRetriesPerRequest: null }` -- this is a BullMQ requirement. By default, ioredis will retry failed commands a limited number of times and then throw. BullMQ needs unlimited retries so it can keep polling Redis for new jobs without crashing. Setting this to `null` means "retry forever." This is one of those config details that will cause a confusing runtime error if you forget it.

One thing to be honest about: this connection object is shared between the Queue and the Worker below. That works, but in a larger production setup you might want separate connections for each to avoid head-of-line blocking issues. For a project at this stage, sharing is fine.

### Creating the queue

```typescript
const operationQueue = new Queue("opsforge-operations", { connection: redisConnection });
```

This creates a queue named `"opsforge-operations"`. The name is just a string identifier -- it is how BullMQ knows which jobs belong to which queue. If you had multiple types of work (emails, reports, notifications), you might have multiple queues with different names.

The `connection` option tells the queue which Redis instance to use. All job data (the job payload, its status, retry count, etc.) gets stored in Redis under keys prefixed with this queue name.

Note that this Queue instance is created in the worker file, but in a real application you would also create a Queue instance (with the same name) in your web server code to *add* jobs. The web server pushes jobs onto the queue; the worker pulls them off.

### Creating the worker

```typescript
new Worker(
  "opsforge-operations",
  async (job) => {
    console.log(`Processing job ${job.id} (${job.name})`);
    return { processedAt: new Date().toISOString() };
  },
  { connection: redisConnection },
);
```

This is where jobs actually get processed. The `Worker` constructor takes three arguments:

1. **Queue name** (`"opsforge-operations"`) -- must match the queue it should consume from. If the names do not match, the worker will sit idle forever, waiting for jobs that never arrive on a queue that does not exist.
2. **Processor function** -- an async function that receives a `job` object. The `job` has properties like `.id` (auto-generated unique ID), `.name` (the name you gave it when adding), and `.data` (the payload). Right now it just logs and returns a timestamp. The return value gets stored as the job's result in Redis, which can be useful for checking what happened later.
3. **Options** -- the Redis connection again.

The worker instance is created with `new Worker(...)` but not assigned to a variable. This is fine -- BullMQ internally manages the worker's lifecycle once it is instantiated. It will start polling Redis for jobs immediately. However, if you wanted to gracefully shut down the worker later (which you should in production), you would need a reference to call `.close()` on. The current code does not handle graceful shutdown, which is a known gap.

### The bootstrap function

```typescript
async function bootstrap() {
  await operationQueue.add("worker-heartbeat", { at: new Date().toISOString() });
  console.log("OpsForge worker online.");
}
```

This function runs once when the worker process starts. It does two things:

1. Adds a `"worker-heartbeat"` job to the queue. This is a clever sanity check -- if the worker is working correctly, it should immediately pick up this job and process it. The job payload is `{ at: new Date().toISOString() }`, just a timestamp of when the heartbeat was sent. It is a "hello world" for the queue system.
2. Logs that the worker is online.

`operationQueue.add()` takes a job name as the first argument and the job data as the second. The name is what shows up as `job.name` in the processor function.

### Starting the process

```typescript
bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

This calls `bootstrap()` and handles any errors that might occur during startup. Since `bootstrap` is async, it returns a Promise. If anything goes wrong (Redis is not running, the connection string is wrong, etc.), the `.catch()` fires, logs the error, and kills the process with exit code 1.

`process.exit(1)` is important here. Exit code 1 signals to whatever is managing this process (Docker, systemd, a process manager like PM2) that the shutdown was abnormal. The process manager can then decide to restart it or alert someone. Exit code 0 means "everything is fine" and would hide the failure.

---

## Concepts Taught

- **Background job processing**: Moving slow or non-urgent work out of the request/response cycle into a separate process.
- **Message queues**: The producer/consumer pattern where one part of the system adds work to a queue and another part picks it up. This is a fundamental distributed systems concept.
- **Redis as infrastructure**: Using Redis not just as a cache but as a message broker. Redis is one of the most versatile tools in backend development.
- **Environment variable configuration**: Using `process.env` with a fallback for local development. This is how you keep secrets and environment-specific config out of your code.
- **Process lifecycle management**: Starting up with a bootstrap function, logging readiness, and exiting with appropriate codes on failure.
- **Library conventions**: Understanding that some config values like `maxRetriesPerRequest: null` exist because of how two libraries interact, not because of your own application logic.

---

## Common Mistakes

1. **Forgetting `maxRetriesPerRequest: null`.** Without this, BullMQ will throw a `MaxRetriesPerRequestError` after a few seconds. The error message is not particularly helpful, so this one catches a lot of people. Always set it when using ioredis with BullMQ.

2. **Mismatched queue names.** If the Worker listens on `"opsforge-ops"` but jobs are added to `"opsforge-operations"`, nothing will happen. No error, no warning -- the worker will just sit there silently. Always double-check the queue name string.

3. **Not running Redis.** This file requires a running Redis instance. If you start the worker without Redis running, the connection will hang or error out. Make sure Redis is running locally (`redis-server` or via Docker) before starting the worker during development.

4. **Putting heavy logic directly in the processor.** The processor function here is trivial, but when you start adding real work, make sure it is idempotent (safe to run more than once with the same input). BullMQ retries failed jobs by default, so your processor might run the same job twice if it crashes halfway through.

5. **No graceful shutdown.** The current code creates a Worker but does not listen for `SIGTERM` or `SIGINT` to shut it down cleanly. In production, if the process is killed mid-job, that job could be left in a broken state. A production-ready version would listen for shutdown signals, call `worker.close()`, and let the current job finish.

---

## Mini Exercises

### Exercise 1: Add a second job type

Modify the `bootstrap` function to also add a job named `"system-check"` with a payload of `{ component: "database", status: "pending" }`. Then update the processor function to log the job name and the component from the data. Access the payload via `job.data`.

<details>
<summary>Hint</summary>

In `bootstrap`, add: `await operationQueue.add("system-check", { component: "database", status: "pending" });`

In the processor, change the log to: `console.log(\`Processing job ${job.id} (${job.name}) - component: ${job.data.component ?? "N/A"}\`);`

The `?? "N/A"` handles jobs (like the heartbeat) that do not have a `component` field in their data.

</details>

### Exercise 2: Handle graceful shutdown

Add a `SIGTERM` signal handler that logs `"Shutting down worker..."` and exits with code 0. To do this properly, you will need to store the Worker instance in a variable so you can call `.close()` on it before exiting.

<details>
<summary>Hint</summary>

First, assign the worker: `const worker = new Worker(...)` instead of just `new Worker(...)`.

Then, after the `bootstrap()` call, add:

```typescript
process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
});
```

Exit code 0 here is correct because this is an intentional, clean shutdown.

</details>

### Exercise 3: Add a failed job handler

BullMQ Workers emit events. Add a listener for the `"failed"` event on the worker that logs the job ID, the job name, and the error message. Look into BullMQ's event API -- the callback receives the job and the error as arguments.

<details>
<summary>Hint</summary>

First, make sure the worker is stored in a variable (see Exercise 2). Then add:

```typescript
worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} (${job?.name}) failed: ${error.message}`);
});
```

The `job?.id` uses optional chaining because in rare edge cases the job reference can be undefined.

</details>

---

## Further Reading

- **BullMQ documentation**: The official docs cover advanced features like job priorities, delayed jobs, rate limiting, repeatable jobs, and job progress tracking.
- **Redis fundamentals**: Understanding Redis data structures (strings, lists, sorted sets) helps you understand how BullMQ stores jobs under the hood.
- **The producer/consumer pattern**: A core distributed systems concept. Read about it in the context of message brokers like RabbitMQ, Kafka, and SQS to see how BullMQ fits into the bigger picture.
- **Process signals (SIGTERM, SIGINT, SIGKILL)**: Understanding Unix signals is essential for writing processes that shut down cleanly in production and container environments.
- **Idempotency in job processing**: Why it matters that running the same job twice produces the same result, and strategies for achieving it (idempotency keys, database transactions, etc.).
- **ioredis connection options**: The ioredis library has many configuration options for reconnection strategies, timeouts, and TLS. Worth understanding for production Redis deployments.
