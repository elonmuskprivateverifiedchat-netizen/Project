import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tradesTable, usersTable, walletsTable, transactionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();


router.get("/", async (req, res) => {
  try {
    const trades = await db.select().from(tradesTable)
      .where(eq(tradesTable.userId, req.userId))
      .orderBy(tradesTable.createdAt);
    res.json(trades.map(t => ({
      id: t.id,
      pair: t.pair,
      type: t.type,
      status: t.status,
      entryPrice: Number(t.entryPrice),
      currentPrice: Number(t.currentPrice),
      targetPrice: Number(t.targetPrice),
      amount: Number(t.amount),
      currency: t.currency,
      profit: Number(t.profit),
      expectedProfit: Number(t.expectedProfit),
      managerId: t.managerId ?? null,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
    })).reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get trades");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/social-wallet", async (req, res) => {
  try {
    const trades = await db.select().from(tradesTable)
      .where(eq(tradesTable.userId, req.userId));

    const activeTrades = trades.filter(t => t.status === "active");
    const completedTrades = trades.filter(t => t.status === "completed");

    const totalProfits = completedTrades.reduce((sum, t) => sum + Number(t.profit), 0);
    const pendingProfits = activeTrades.reduce((sum, t) => sum + Number(t.profit), 0);

    res.json({
      totalProfits,
      pendingProfits,
      currency: "USDT",
      locked: activeTrades.length > 0,
      activeTrades: activeTrades.length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get social wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:tradeId/release", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (user?.tradingLocked) {
      res.status(423).json({ error: "Trading features are locked until monthly maintenance and compulsory trading requirements are cleared." });
      return;
    }

    const { tradeId } = req.params;
    const [trade] = await db.select().from(tradesTable)
      .where(and(eq(tradesTable.id, tradeId), eq(tradesTable.userId, req.userId)));

    if (!trade) {
      res.status(404).json({ error: "Trade not found" });
      return;
    }

    if (trade.status !== "completed") {
      res.json({ success: false, message: "Trade must be completed before releasing funds" });
      return;
    }

    const mainWallets = await db.select().from(walletsTable)
      .where(and(eq(walletsTable.userId, req.userId), eq(walletsTable.type, "main")));

    if (mainWallets.length > 0) {
      const profit = Number(trade.profit);
      const newBalance = Number(mainWallets[0].balance) + profit;
      await db.update(walletsTable)
        .set({ balance: newBalance.toFixed(8) })
        .where(eq(walletsTable.id, mainWallets[0].id));

      await db.insert(transactionsTable).values({
        walletId: mainWallets[0].id,
        userId: req.userId,
        type: "trade_profit",
        amount: profit.toFixed(8),
        currency: trade.currency,
        status: "completed",
        description: `Trade profit released from ${trade.pair}`,
      });
    }

    res.json({ success: true, message: "Funds released to main wallet successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to release trade funds");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
