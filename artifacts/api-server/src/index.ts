import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { startWithdrawalReminderJob } from "./lib/withdrawalReminders";
import { attachSocketIO } from "./lib/forex-socket";

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
