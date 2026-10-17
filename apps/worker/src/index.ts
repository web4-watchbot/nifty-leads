/**
 * Worker entry point (SPEC Section 4).
 * A separate Node.js process running pg-boss jobs for the Run pipeline.
 * Long Runs cannot run inside serverless functions, so they run here.
 */

import { PgBoss } from "pg-boss";
import { Pool } from "pg";
import * as dbSchema from "@nifty-leads/db";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 4);
const boss = new PgBoss(connectionString);

// Job handlers are registered per phase. Phase 0 starts the worker empty;
// Phase 1A registers the Run pipeline jobs (SPEC Section 10.2).
// Example skeleton:
// boss.work("run.plan", { concurrency }, async (job) => { ... });

async function main() {
  await boss.start();
  console.log(`Nifty Leads worker started (concurrency=${concurrency})`);

  process.on("SIGTERM", async () => {
    await boss.stop();
    await pool.end();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});

export { boss, pool, dbSchema };
