import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, walletsTable, notificationsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// ── Forex pair definitions ─────────────────────────────────────────────────
const FOREX_PAIRS = [
  { pair: "EUR/USD", base: "EUR", quote: "USD", spread: 0.0001, category: "major", pip: 0.0001 },
  { pair: "GBP/USD", base: "GBP", quote: "USD", spread: 0.0002, category: "major", pip: 0.0001 },
  { pair: "USD/JPY", base: "USD", quote: "JPY", spread: 0.02,   category: "major", pip: 0.01   },
  { pair: "USD/CHF", base: "USD", quote: "CHF", spread: 0.0002, category: "major", pip: 0.0001 },
  { pair: "AUD/USD", base: "AUD", quote: "USD", spread: 0.0002, category: "major", pip: 0.0001 },
  { pair: "USD/CAD", base: "USD", quote: "CAD", spread: 0.0003, category: "major", pip: 0.0001 },
  { pair: "NZD/USD", base: "NZD", quote: "USD", spread: 0.0002, category: "major", pip: 0.0001 },
  { pair: "EUR/GBP", base: "EUR", quote: "GBP", spread: 0.0001, category: "minor", pip: 0.0001 },
  { pair: "EUR/JPY", base: "EUR", quote: "JPY", spread: 0.03,   category: "minor", pip: 0.01   },
  { pair: "GBP/JPY", base: "GBP", quote: "JPY", spread: 0.04,   category: "minor", pip: 0.01   },
  { pair: "EUR/CHF", base: "EUR", quote: "CHF", spread: 0.0003, category: "minor", pip: 0.0001 },
  { pair: "XAU/USD", base: "XAU", quote: "USD", spread: 0.30,   category: "metal", pip: 0.01   },
  { pair: "XAG/USD", base: "XAG", quote: "USD", spread: 0.02,   category: "metal", pip: 0.001  },
  { pair: "BTC/USD", base: "BTC", quote: "USD", spread: 50,     category: "crypto", pip: 1     },
  { pair: "ETH/USD", base: "ETH", quote: "USD", spread: 3,      category: "crypto", pip: 0.01  },
];

// Simulated live rates with realistic randomness
function getLiveRate(pair: string): { bid: number; ask: number; mid: number; change24h: number } {
  const BASE_RATES: Record<string, number> = {
    "EUR/USD": 1.0842, "GBP/USD": 1.2713, "USD/JPY": 149.85, "USD/CHF": 0.9012,
    "AUD/USD": 0.6521, "USD/CAD": 1.3612, "NZD/USD": 0.5987, "EUR/GBP": 0.8528,
    "EUR/JPY": 162.54, "GBP/JPY": 190.38, "EUR/CHF": 0.9762, "XAU/USD": 2387.50,
    "XAG/USD": 28.42,  "BTC/USD": 67450.00, "ETH/USD": 3512.00,
  };
  const meta = FOREX_PAIRS.find(p => p.pair === pair);
  const base = BASE_RATES[pair] ?? 1.0;
  const jitter = (Math.random() - 0.5) * base * 0.0002;
  const mid = base + jitter;
  const spread = meta?.spread ?? 0.0002;
  return {
    bid: +(mid - spread / 2).toFixed(5),
    ask: +(mid + spread / 2).toFixed(5),
    mid: +mid.toFixed(5),
    change24h: +((Math.random() - 0.48) * 0.8).toFixed(3),
  };
}

// GET /api/trading/pairs
router.get("/pairs", (_req, res) => {
  res.json({
    pairs: FOREX_PAIRS,
    total: FOREX_PAIRS.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/trading/rates
router.get("/rates", (req, res) => {
  const { pairs } = req.query as { pairs?: string };
  const requested = pairs ? pairs.split(",").map(p => p.trim().toUpperCase()) : FOREX_PAIRS.map(p => p.pair);

  const rates = requested
    .filter(p => FOREX_PAIRS.some(fp => fp.pair === p))
    .map(pair => ({
      pair,
      ...getLiveRate(pair),
      timestamp: new Date().toISOString(),
    }));

  res.json({ rates, count: rates.length, timestamp: new Date().toISOString() });
});

// GET /api/trading/rates/:pair
router.get("/rates/:pair", (req, res) => {
  const pairParam = req.params.pair.replace("-", "/").toUpperCase();
  const meta = FOREX_PAIRS.find(p => p.pair === pairParam);
  if (!meta) {
    res.status(404).json({ error: `Pair ${pairParam} not found` });
    return;
  }
  res.json({ pair: pairParam, meta, ...getLiveRate(pairParam), timestamp: new Date().toISOString() });
});

// POST /api/trading/order  (requires auth — checked explicitly since router is public)
router.post("/order", async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required", code: 401 });
    return;
  }
  try {
    const {
      pair,
      type,
      direction,
      amount,
      walletId,
      leverage = 1,
      stopLoss,
      takeProfit,
    } = req.body as {
      pair: string;
      type: "market" | "limit";
      direction: "buy" | "sell";
      amount: number;
      walletId: string;
      leverage?: number;
      stopLoss?: number;
      takeProfit?: number;
    };

    if (!pair || !type || !direction || !amount || !walletId) {
      res.status(400).json({ error: "pair, type, direction, amount, and walletId are required" });
      return;
    }

    const pairNorm = pair.replace("-", "/").toUpperCase();
    const pairMeta = FOREX_PAIRS.find(p => p.pair === pairNorm);
    if (!pairMeta) {
      res.status(400).json({ error: `Invalid pair: ${pairNorm}` });
      return;
    }

    if (!["market", "limit"].includes(type)) {
      res.status(400).json({ error: "type must be 'market' or 'limit'" });
      return;
    }
    if (!["buy", "sell"].includes(direction)) {
      res.status(400).json({ error: "direction must be 'buy' or 'sell'" });
      return;
    }

    const tradeAmount = Number(amount);
    const effectiveLeverage = Math.min(Math.max(Number(leverage), 1), 500);

    const [wallet] = await db.select().from(walletsTable)
      .where(and(eq(walletsTable.id, walletId), eq(walletsTable.userId, req.userId)));

    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    const marginRequired = tradeAmount / effectiveLeverage;
    if (Number(wallet.balance) < marginRequired) {
      res.status(400).json({ error: "Insufficient margin", required: marginRequired, available: Number(wallet.balance) });
      return;
    }

    const rate = getLiveRate(pairNorm);
    const executionPrice = direction === "buy" ? rate.ask : rate.bid;

    // Deduct margin
    await db.update(walletsTable)
      .set({ balance: (Number(wallet.balance) - marginRequired).toFixed(8) })
      .where(eq(walletsTable.id, walletId));

    const [tx] = await db.insert(transactionsTable).values({
      walletId,
      userId: req.userId,
      type: "withdrawal",
      amount: marginRequired.toFixed(8),
      currency: wallet.currency,
      status: "completed",
      description: `${direction.toUpperCase()} ${pairNorm} — ${tradeAmount} @ ${executionPrice} | Leverage: ${effectiveLeverage}x${stopLoss ? ` | SL: ${stopLoss}` : ""}${takeProfit ? ` | TP: ${takeProfit}` : ""}`,
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.userId,
      title: `Trade Opened — ${pairNorm}`,
      message: `${direction.toUpperCase()} order for ${tradeAmount} ${pairNorm} opened at ${executionPrice} with ${effectiveLeverage}x leverage.`,
      type: "info",
      link: "/trading",
    });

    res.status(201).json({
      success: true,
      order: {
        id: tx.id,
        pair: pairNorm,
        type,
        direction,
        amount: tradeAmount,
        leverage: effectiveLeverage,
        executionPrice,
        marginRequired,
        stopLoss: stopLoss ?? null,
        takeProfit: takeProfit ?? null,
        status: "open",
        openedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Order placement failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
