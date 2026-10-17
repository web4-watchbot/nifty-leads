/**
 * Runs the pending SQL migrations against the database.
 * Usage: DATABASE_URL=... pnpm --filter @nifty-leads/db migrate
 */

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  // Ensure migrations table exists and run migrations from the SQL folder.
  await migrate(db, {
    migrationsFolder: "./src/migrations",
  });

  console.log("Migrations complete");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
