import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, walletsTable, notificationsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// ── Investment plans definition ────────────────────────────────────────────
const INVESTMENT_PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "Ideal for new investors. Fixed low-risk returns over 30 days.",
    roiPercent: 8,
    durationDays: 30,
    minAmount: 500,
    maxAmount: 4999,
    currency: "USDC",
    isActive: true,
    features: ["Daily ROI reports", "Capital protected", "Email alerts"],
  },
  {
    id: "growth",
    name: "Growth",
    description: "Balanced risk/reward with managed forex exposure.",
    roiPercent: 15,
    durationDays: 60,
    minAmount: 5000,
    maxAmount: 24999,
    currency: "USDC",
    isActive: true,
    features: ["Priority support", "Weekly performance reports", "Auto-reinvest option"],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Active managed forex trading with institutional strategies.",
    roiPercent: 25,
    durationDays: 90,
    minAmount: 25000,
    maxAmount: 99999,
    currency: "USDC",
    isActive: true,
    features: ["Dedicated account manager", "Daily P&L statements", "Early exit option"],
  },
  {
    id: "elite",
    name: "Elite",
    description: "Premium quant-driven strategies for high-net-worth investors.",
    roiPercent: 40,
    durationDays: 180,
    minAmount: 100000,
    maxAmount: null,
    currency: "USDC",
    isActive: true,
    features: ["VIP concierge", "Real-time dashboard", "Quarterly audited reports", "Compound interest option"],
  },
] as const;

// GET /api/investment/plans
router.get("/plans", (_req, res) => {
  res.json({
    plans: INVESTMENT_PLANS,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/investment/plans/:id
router.get("/plans/:id", (req, res) => {
  const plan = INVESTMENT_PLANS.find(p => p.id === req.params.id);
  if (!plan) {
    res.status(404).json({ error: "Plan not found", code: 404 });
    return;
  }
  res.json(plan);
});

// POST /api/investment/subscribe
router.post("/subscribe", async (req, res) => {
  try {
    const { planId, amount, walletId } = req.body as { planId: string; amount: number; walletId: string };

    if (!planId || !amount || !walletId) {
      res.status(400).json({ error: "planId, amount, and walletId are required" });
      return;
    }

    const plan = INVESTMENT_PLANS.find(p => p.id === planId);
    if (!plan || !plan.isActive) {
      res.status(404).json({ error: "Investment plan not found or inactive" });
      return;
    }

    const investAmount = Number(amount);
    if (investAmount < plan.minAmount) {
      res.status(400).json({ error: `Minimum investment for ${plan.name} is ${plan.minAmount} ${plan.currency}` });
      return;
    }
    if (plan.maxAmount && investAmount > plan.maxAmount) {
      res.status(400).json({ error: `Maximum investment for ${plan.name} is ${plan.maxAmount} ${plan.currency}` });
      return;
    }

    // Verify wallet ownership and balance
    const [wallet] = await db.select().from(walletsTable)
      .where(and(eq(walletsTable.id, walletId), eq(walletsTable.userId, req.userId)));

    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    const balance = Number(wallet.balance);
    if (balance < investAmount) {
      res.status(400).json({ error: "Insufficient wallet balance", available: balance });
      return;
    }

    // Deduct amount and create investment transaction
    await db.update(walletsTable)
      .set({ balance: (balance - investAmount).toFixed(8) })
      .where(eq(walletsTable.id, walletId));

    const endDate = new Date(Date.now() + plan.durationDays * 24 * 3600 * 1000);
    const projectedReturn = investAmount * (1 + plan.roiPercent / 100);

    const [tx] = await db.insert(transactionsTable).values({
      walletId,
      userId: req.userId,
      type: "withdrawal",
      amount: investAmount.toFixed(8),
      currency: wallet.currency,
      status: "completed",
      description: `Investment: ${plan.name} Plan — ${plan.roiPercent}% ROI over ${plan.durationDays} days. Matures: ${endDate.toDateString()}`,
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.userId,
      title: `${plan.name} Investment Activated`,
      message: `Your ${investAmount.toLocaleString()} ${wallet.currency} investment in the ${plan.name} plan is active. Expected return: ${projectedReturn.toLocaleString()} ${wallet.currency} on ${endDate.toDateString()}.`,
      type: "success",
      link: "/wallet",
    });

    res.status(201).json({
      success: true,
      investment: {
        transactionId: tx.id,
        planId: plan.id,
        planName: plan.name,
        amountInvested: investAmount,
        roiPercent: plan.roiPercent,
        durationDays: plan.durationDays,
        startDate: new Date().toISOString(),
        endDate: endDate.toISOString(),
        projectedReturn,
        currency: wallet.currency,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Investment subscription failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
