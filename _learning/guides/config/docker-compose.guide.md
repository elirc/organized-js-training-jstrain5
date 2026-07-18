# Guide: docker-compose.yml

> **File:** `docker-compose.yml` (project root)
> **Role:** Defines all the services (containers) needed to run the full application stack locally. One command (`docker compose up`) starts everything.

---

## Purpose

This project needs four things running simultaneously:

1. **The Next.js web app** (serves the UI and API)
2. **The background worker** (processes queued jobs)
3. **PostgreSQL** (the database)
4. **Redis** (the message broker / cache)

You *could* install Postgres and Redis directly on your machine, but that's messy -- different versions, different operating systems, conflicting ports. Docker Compose solves this by running each piece in an isolated container with a known configuration.

Think of `docker-compose.yml` as a recipe: "Here are the four things I need, here's how to configure each one, and here's how they connect to each other."

---

## Line-by-Line Walkthrough

### The `app` Service (Next.js)

```yaml
services:
  app:
    image: node:22-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./:/app
    depends_on:
      - postgres
      - redis
```

Let's break this apart:

**`image: node:22-alpine`** -- Use the official Node.js 22 image based on Alpine Linux. Alpine is a tiny Linux distribution (~5MB), so the image downloads fast and uses less disk space. Node 22 is the current LTS (Long Term Support) version.

**`working_dir: /app`** -- Inside the container, set the working directory to `/app`. All commands will run from this path.

**`command: sh -c "npm install && npm run dev"`** -- The command that runs when the container starts. It first installs dependencies (`npm install`), then starts the dev server (`npm run dev`). The `sh -c` wrapper is needed because we're chaining two commands with `&&`.

A note on this: running `npm install` every time the container starts is slow. In a production setup, you'd build a custom Dockerfile that copies `package.json` first, runs install (which gets cached in a Docker layer), and then copies the rest of the code. This compose file prioritizes simplicity over speed -- fine for local development, not great for production.

**`ports: - "3000:3000"`** -- Maps port 3000 on your host machine to port 3000 inside the container. The format is `host:container`. After this, you can visit `http://localhost:3000` in your browser and it reaches the Next.js dev server running inside the container.

**`env_file: - .env`** -- Load environment variables from the `.env` file at the project root. This is how the app gets `DATABASE_URL`, `REDIS_URL`, and other configuration. The container inherits all variables defined in that file.

**`volumes: - ./:/app`** -- This is a *bind mount*. It maps the current directory on your host (`./`) to `/app` inside the container. This means the container sees your actual source files. When you edit a file in your editor, the change is immediately visible inside the container, and the Next.js hot-reload picks it up. Without this, you'd have to rebuild the container every time you change code.

**`depends_on: - postgres - redis`** -- Start `postgres` and `redis` before starting `app`. This is a *startup order* guarantee, but it's shallow -- it only waits for the containers to *start*, not for the services inside them to be *ready*. Postgres might still be initializing when the app tries to connect. In practice, this usually works because npm install takes long enough for Postgres to be ready. But for a robust setup, you'd use health checks.

### The `worker` Service

```yaml
  worker:
    image: node:22-alpine
    working_dir: /app
    command: sh -c "npm install && npx tsx worker/index.ts"
    env_file:
      - .env
    volumes:
      - ./:/app
    depends_on:
      - postgres
      - redis
```

This is almost identical to `app`, with two differences:

1. **No `ports` mapping.** The worker doesn't serve HTTP traffic. It just connects to Redis to pick up jobs and to Postgres to read/write data. No one visits the worker in a browser.

2. **Different `command`.** Instead of `npm run dev`, it runs `npx tsx worker/index.ts` directly. This starts the BullMQ worker that listens for background jobs.

The worker shares the same volume mount (`./:/app`), so it sees the same code as the app. It also shares the same `.env` file, so it has the same database and Redis credentials.

### The `postgres` Service

```yaml
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: opsforge
      POSTGRES_USER: opsforge
      POSTGRES_PASSWORD: opsforge_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    command: postgres -c shared_preload_libraries=pg_trgm
```

**`image: postgres:16-alpine`** -- PostgreSQL version 16 on Alpine Linux.

**`environment`** -- These three variables configure the database that Postgres creates on first startup:
- `POSTGRES_DB: opsforge` -- Create a database called `opsforge`.
- `POSTGRES_USER: opsforge` -- Create a user called `opsforge`.
- `POSTGRES_PASSWORD: opsforge_dev` -- Set the password. Yes, this is a plaintext password in a config file. For local development, that's fine. For production, you'd use Docker secrets or an external secrets manager. **Never commit real production credentials.**

**`ports: - "5432:5432"`** -- Expose Postgres on the standard port. This lets you connect from your host machine using tools like pgAdmin, DBeaver, or `psql`.

**`volumes: - pgdata:/var/lib/postgresql/data`** -- This is a *named volume* (not a bind mount like the app uses). `pgdata` is a Docker-managed volume that persists your database data even when the container is destroyed and recreated. Without this, you'd lose all your data every time you run `docker compose down`.

The path `/var/lib/postgresql/data` is where Postgres stores its data files inside the container. By mapping a named volume there, the data lives on your host's disk in a Docker-managed location.

**`command: postgres -c shared_preload_libraries=pg_trgm`** -- Overrides the default Postgres startup command to preload the `pg_trgm` extension. This extension provides fuzzy text matching and trigram similarity search. The project likely uses it for search features (like "find incidents matching this text"). Preloading it means it's available immediately when the database starts.

### The `redis` Service

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

The simplest service. Redis 7 on Alpine, exposed on its default port. No persistent storage is configured, which means **Redis data is lost when the container stops.** That's usually fine for development -- BullMQ jobs and caches are ephemeral by nature. For production, you'd add a volume.

### Named Volumes

```yaml
volumes:
  pgdata:
```

This declares the `pgdata` named volume at the top level. Docker manages where this data actually lives on your disk (usually somewhere in `/var/lib/docker/volumes/` on Linux, or in the Docker Desktop VM on Mac/Windows). You reference it by name in the `postgres` service's `volumes` section.

---

## Concepts Taught

1. **Containers vs. the host machine** -- Each service runs in an isolated environment with its own filesystem, network, and processes. Ports and volumes are the bridges between the container and your machine.
2. **Bind mounts vs. named volumes** -- Bind mounts (`./:/app`) mirror a host directory. Named volumes (`pgdata`) are managed by Docker for persistent data.
3. **Service dependencies and startup order** -- `depends_on` controls order but not readiness.
4. **Environment configuration** -- Using `environment` for inline variables and `env_file` for loading from a file.
5. **Port mapping** -- `host:container` format and why it matters.
6. **Ephemeral vs. persistent data** -- Redis loses data on restart (no volume). Postgres keeps data (named volume).

---

## Common Mistakes

1. **Editing code and not seeing changes.** If the volume mount is misconfigured or you're running without volumes, changes on your host won't appear in the container. Verify the bind mount is correct: `./:/app`.

2. **"Connection refused" errors on startup.** The app starts before Postgres is ready to accept connections. `depends_on` only waits for the container to start, not for Postgres to initialize. Solutions: add a retry/wait loop in your app's database connection code, or add a `healthcheck` to the postgres service and use `depends_on: postgres: condition: service_healthy`.

3. **Running out of disk space.** Docker volumes and images accumulate over time. Run `docker system prune` periodically to clean up unused resources. Be careful -- this deletes stopped containers and unused images.

4. **Port conflicts.** If you already have Postgres running natively on port 5432, Docker can't bind to the same port. Either stop the native service or change the host port: `"5433:5432"` (access via 5433 on host, still 5432 inside the container).

5. **Forgetting that `docker compose down` doesn't delete volumes.** Your database data survives `docker compose down`. To truly start fresh, use `docker compose down -v` (the `-v` flag removes named volumes too). Be careful -- this deletes your database.

6. **Hardcoded credentials in the compose file.** The postgres password `opsforge_dev` is fine for local development. But if you copy this pattern for a production deployment, you've got credentials in version control. Use environment variables or Docker secrets in production.

---

## Mini Exercises

### Exercise 1: Add a Health Check
Add a health check to the `postgres` service so Docker knows when Postgres is truly ready (not just started). Then update `app` to wait for the health check.

<details>
<summary>Solution</summary>

```yaml
  postgres:
    image: postgres:16-alpine
    # ... existing config ...
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opsforge"]
      interval: 5s
      timeout: 5s
      retries: 5
```

And update the app's `depends_on`:

```yaml
  app:
    # ... existing config ...
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
```

Now Docker will wait until `pg_isready` reports success before starting the app.
</details>

### Exercise 2: Change the Postgres Port
Imagine you already have Postgres running on port 5432. Modify the compose file so the containerized Postgres is accessible on port 5433 from your host machine, while still using 5432 internally.

<details>
<summary>Solution</summary>

Change the ports mapping:

```yaml
    ports:
      - "5433:5432"
```

Now connect from your host with `localhost:5433`. The container still uses 5432 internally. Other containers (like `app`) connect to `postgres:5432` using Docker's internal network -- they don't use the host port mapping at all.
</details>

### Exercise 3: Inspect a Running Container
Start the stack with `docker compose up -d`, then use `docker compose exec postgres psql -U opsforge -d opsforge` to open a Postgres shell inside the running container. Run `\dt` to list tables. Run `SELECT count(*) FROM pg_extension;` to see what extensions are loaded.

<details>
<summary>Hint</summary>

`docker compose exec` runs a command inside an already-running container. `psql` is the Postgres interactive terminal. `-U` specifies the user, `-d` specifies the database. Once inside, `\dt` lists tables and `\dx` lists extensions (look for `pg_trgm`).
</details>

---

## Further Reading

- [Docker Compose documentation](https://docs.docker.com/compose/) -- Official reference for the compose file format.
- [Docker volumes explained](https://docs.docker.com/storage/volumes/) -- Bind mounts vs. named volumes vs. tmpfs.
- [Postgres Docker image](https://hub.docker.com/_/postgres) -- All the environment variables and configuration options available.
- [Docker networking](https://docs.docker.com/compose/networking/) -- How containers find each other by service name.
- [12-factor app: config](https://12factor.net/config) -- Why configuration (like database URLs) should come from environment variables, not code.
