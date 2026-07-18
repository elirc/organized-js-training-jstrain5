import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const redisConnection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const operationQueue = new Queue("opsforge-operations", { connection: redisConnection });

new Worker(
  "opsforge-operations",
  async (job) => {
    console.log(`Processing job ${job.id} (${job.name})`);
    return { processedAt: new Date().toISOString() };
  },
  { connection: redisConnection },
);

async function bootstrap() {
  await operationQueue.add("worker-heartbeat", { at: new Date().toISOString() });
  console.log("OpsForge worker online.");
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
