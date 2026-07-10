import { createRequire } from "node:module";
import { createServer } from "http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "pg";
import app from "./app";
import { logger } from "./lib/logger";
import { startWithdrawalReminderJob } from "./lib/withdrawalReminders";
import { attachSocketIO } from "./lib/forex-socket";

async function waitForDatabase(retries = 30, delayMs = 1000) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to wait for the database.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await client.connect();
      await client.query("SELECT 1");
      logger.info({ attempt }, "Database is ready");
      return;
    } catch (error) {
      logger.warn({ err: error, attempt }, "Database not ready yet, retrying");
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } finally {
      await client.end().catch(() => {});
    }
  }
  throw new Error("Database did not become ready in time.");
}

async function runDatabaseMigrations() {
  if (process.env.DB_AUTO_MIGRATE?.toLowerCase() !== "true") {
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to run database migrations.");
  }

  await waitForDatabase();

  const configPath = join(dirname(fileURLToPath(import.meta.url)), "../lib/db/drizzle.config.ts");
  logger.info({ configPath }, "Running database migrations");

  await new Promise<void>((resolve, reject) => {
    const require = createRequire(import.meta.url);
    const drizzleMain = require.resolve("drizzle-kit");
    const drizzleBin = join(dirname(drizzleMain), "bin.cjs");
    const child = spawn(process.execPath, [drizzleBin, "push", "--config", configPath], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`drizzle-kit exited with code ${code}`));
      }
    });
  });
}

if (process.env.DB_AUTO_MIGRATE?.toLowerCase() === "true") {
  await runDatabaseMigrations();
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
attachSocketIO(httpServer);

httpServer.listen(port, () => {
  logger.info({ port }, "XpressProFX API server listening");
  startWithdrawalReminderJob();
});

httpServer.on("error", (err) => {
  logger.error({ err }, "HTTP server error");
  process.exit(1);
});
