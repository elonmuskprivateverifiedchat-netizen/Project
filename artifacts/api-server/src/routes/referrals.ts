import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, referralBonusesTable, walletsTable, transactionsTable, notificationsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/referrals/info — get own referral code + stats
router.get("/info", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const bonuses = await db.select().from(referralBonusesTable)
      .where(eq(referralBonusesTable.referrerId, req.userId));

    const totalEarned = bonuses.filter(b => b.status === "paid").reduce((s, b) => s + Number(b.bonusAmount), 0);
    const pendingEarned = bonuses.filter(b => b.status === "pending").reduce((s, b) => s + Number(b.bonusAmount), 0);

    res.json({
      referralCode: user.referralCode,
      referralValidUntil: user.referralValidUntil,
      totalReferrals: bonuses.length,
      paidReferrals: bonuses.filter(b => b.status === "paid").length,
      pendingReferrals: bonuses.filter(b => b.status === "pending").length,
      totalEarned,
      pendingEarned,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get referral info");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/referrals/claim — auto-claim pending bonus when user starts trading
router.post("/claim", async (req, res) => {
  try {
    const pendingBonuses = await db.select().from(referralBonusesTable)
      .where(and(
        eq(referralBonusesTable.referredUserId, req.userId),
        eq(referralBonusesTable.status, "pending"),
      ));

    for (const bonus of pendingBonuses) {
      // Pay $500 to referrer
      const [wallet] = await db.select().from(walletsTable)
        .where(and(eq(walletsTable.userId, bonus.referrerId), eq(walletsTable.type, "main")));

      if (wallet) {
        const newBalance = (Number(wallet.balance) + Number(bonus.bonusAmount)).toFixed(2);
        await db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.id, wallet.id));

        await db.insert(transactionsTable).values({
          walletId: wallet.id,
          userId: bonus.referrerId,
          type: "deposit",
          amount: bonus.bonusAmount,
          currency: "USDC",
          status: "completed",
          description: `Referral bonus: $${bonus.bonusAmount} jackpot reward`,
        });

        await db.insert(notificationsTable).values({
          userId: bonus.referrerId,
          title: "Referral Jackpot! $500 Earned",
          message: `Your referral has started trading! $500 referral bonus has been credited to your main wallet.`,
          type: "success",
          link: "/wallet",
        });
      }

      await db.update(referralBonusesTable)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(referralBonusesTable.id, bonus.id));
    }

    res.json({ success: true, claimed: pendingBonuses.length });
  } catch (err) {
    req.log.error({ err }, "Failed to claim referral bonus");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
