import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tradesTable, usersTable, transactionsTable, walletsTable } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";

const router: IRouter = Router();

const daysFrom = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

async function getProgramStatus(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;

  const now = new Date();
  const aiBotTrialEndsAt = user.aiBotTrialEndsAt ?? daysFrom(user.createdAt, 90);
  const aiBotSubscriptionStatus = user.aiBotSubscriptionStatus || "trial";
  const aiBotActive = aiBotSubscriptionStatus === "active" || now <= aiBotTrialEndsAt;

  const maintenanceDueAt = user.maintenanceDueAt ?? daysFrom(user.createdAt, 30);
  const maintenanceGraceEndsAt = user.maintenanceGraceEndsAt ?? daysFrom(maintenanceDueAt, 14);
  const maintenanceOverdue = now > maintenanceDueAt;
  const graceExpired = now > maintenanceGraceEndsAt;

  const [latestTrade] = await db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.userId, userId))
    .orderBy(desc(tradesTable.createdAt))
    .limit(1);

  const compulsoryWindowStart = daysFrom(maintenanceDueAt, -30);
  const lastCompulsoryTradeAt = user.lastCompulsoryTradeAt ?? latestTrade?.createdAt ?? null;
  const compulsoryTradeComplete = Boolean(lastCompulsoryTradeAt && lastCompulsoryTradeAt >= compulsoryWindowStart);
  const tradingLocked = graceExpired || user.tradingLocked;

  if (tradingLocked !== user.tradingLocked) {
    await db.update(usersTable).set({ tradingLocked }).where(eq(usersTable.id, userId));
  }

  return {
    aiBot: {
      status: aiBotActive ? (aiBotSubscriptionStatus === "active" ? "active" : "trial") : "expired",
      active: aiBotActive,
      trialEndsAt: aiBotTrialEndsAt.toISOString(),
      subscriptionStatus: aiBotSubscriptionStatus,
    },
    maintenance: {
      dueAt: maintenanceDueAt.toISOString(),
      graceEndsAt: maintenanceGraceEndsAt.toISOString(),
      overdue: maintenanceOverdue,
      graceExpired,
      tradingLocked,
      compulsoryTradeComplete,
      lastCompulsoryTradeAt: lastCompulsoryTradeAt?.toISOString() ?? null,
    },
  };
}

router.get("/status", async (req, res) => {
  try {
    const status = await getProgramStatus(req.userId);
    if (!status) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(status);
  } catch (err) {
    req.log.error({ err }, "Failed to get program status");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai-bot/subscribe", async (req, res) => {
  try {
    const now = new Date();
    await db.update(usersTable).set({
      aiBotSubscriptionStatus: "active",
      aiBotTrialEndsAt: daysFrom(now, 90),
    }).where(eq(usersTable.id, req.userId));
    res.json({ success: true, message: "AI bot subscription is active." });
  } catch (err) {
    req.log.error({ err }, "Failed to activate AI bot subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/maintenance/record", async (req, res) => {
  try {
    const [mainWallet] = await db.select().from(walletsTable).where(and(eq(walletsTable.userId, req.userId), eq(walletsTable.type, "main")));
    const now = new Date();
    const nextDueAt = daysFrom(now, 30);
    await db.update(usersTable).set({
      maintenanceDueAt: nextDueAt,
      maintenanceGraceEndsAt: daysFrom(nextDueAt, 14),
      tradingLocked: false,
    }).where(eq(usersTable.id, req.userId));

    if (mainWallet) {
      await db.insert(transactionsTable).values({
        walletId: mainWallet.id,
        userId: req.userId,
        type: "maintenance_fee",
        amount: String(req.body?.amount ?? "0"),
        currency: mainWallet.currency,
        status: "completed",
        description: "Monthly maintenance recorded by company representative",
      });
    }

    res.json({ success: true, nextDueAt: nextDueAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to record maintenance");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/compulsory-trade", async (req, res) => {
  try {
    await db.update(usersTable).set({ lastCompulsoryTradeAt: new Date() }).where(eq(usersTable.id, req.userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to record compulsory trade");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;