import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { logger } from "./logger";

const FOREX_PAIRS = [
  { pair: "EUR/USD", base: 1.0842 },
  { pair: "GBP/USD", base: 1.2713 },
  { pair: "USD/JPY", base: 149.85 },
  { pair: "USD/CHF", base: 0.9012 },
  { pair: "AUD/USD", base: 0.6521 },
  { pair: "USD/CAD", base: 1.3612 },
  { pair: "XAU/USD", base: 2387.50 },
  { pair: "BTC/USD", base: 67450.00 },
  { pair: "ETH/USD", base: 3512.00 },
];

function getLiveRate(pair: string, base: number) {
  const jitter = (Math.random() - 0.5) * base * 0.0003;
  const mid = +(base + jitter).toFixed(5);
  const change24h = +((Math.random() - 0.48) * 0.9).toFixed(3);
  return { pair, price: mid, change24h, timestamp: Date.now() };
}

let io: Server | null = null;
let streamInterval: ReturnType<typeof setInterval> | null = null;

export function attachSocketIO(httpServer: HttpServer): Server {
  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",").map(o => o.trim()).filter(Boolean);

  io = new Server(httpServer, {
    // Path must be under /api/ so Replit's proxy routes it to this server.
    // The frontend client uses the same path.
    path: "/api/socket.io",
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    logger.debug({ socketId: socket.id }, "Socket.io client connected");
    // Send immediate snapshot on connect
    socket.emit("rates", FOREX_PAIRS.map(({ pair, base }) => getLiveRate(pair, base)));

    socket.on("subscribe", (pairs: string[]) => {
      socket.data.pairs = Array.isArray(pairs) ? pairs : [];
    });

    socket.on("disconnect", () => {
      logger.debug({ socketId: socket.id }, "Socket.io client disconnected");
    });
  });

  // Broadcast live rates every 2 seconds
  streamInterval = setInterval(() => {
    if (!io) return;
    const rates = FOREX_PAIRS.map(({ pair, base }) => getLiveRate(pair, base));
    io.emit("rates", rates);
  }, 2000);

  logger.info("Socket.io server attached — streaming forex rates every 2s");
  return io;
}

export function getIO(): Server | null {
  return io;
}

export function stopSocketIO() {
  if (streamInterval) clearInterval(streamInterval);
  if (io) io.close();
}
