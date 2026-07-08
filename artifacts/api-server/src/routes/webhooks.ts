import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { transactionsTable, walletsTable, notificationsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// ── Verify webhook signature ───────────────────────────────────────────────
function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── POST /api/webhooks/payment ─────────────────────────────────────────────
router.post("/payment", async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"] as string | undefined;
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET ?? "";
    const rawBody = JSON.stringify(req.body);

    if (webhookSecret && signature && !verifySignature(rawBody, signature, webhookSecret)) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const { event, data } = req.body as {
      event: string;
      data: { userId: string; amount: number; currency: string; walletId?: string; reference: string };
    };

    req.log.info({ event, reference: data?.reference }, "Payment webhook received");

    if (event === "payment.success" && data) {
      const { userId, amount, currency, walletId, reference } = data;

      // Find user's main wallet
      let targetWalletId = walletId;
      if (!targetWalletId) {
        const [mainWallet] = await db.select().from(walletsTable)
          .where(and(eq(walletsTable.userId, userId), eq(walletsTable.type as any, "main")));
        if (mainWallet) targetWalletId = mainWallet.id;
      }

      if (targetWalletId) {
        const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, targetWalletId));
        if (wallet) {
          await db.update(walletsTable)
            .set({ balance: (Number(wallet.balance) + Number(amount)).toFixed(8) })
            .where(eq(walletsTable.id, targetWalletId));

          await db.insert(transactionsTable).values({
            walletId: targetWalletId,
            userId,
            type: "deposit",
            amount: Number(amount).toFixed(8),
            currency: currency || wallet.currency,
            status: "completed",
            description: `Payment gateway deposit — ref: ${reference}`,
          });

          await db.insert(notificationsTable).values({
            userId,
            title: "Deposit Confirmed",
            message: `${Number(amount).toLocaleString()} ${currency || wallet.currency} has been credited to your account via payment gateway.`,
            type: "success",
            link: "/wallet",
          });
        }
      }
    }

    res.json({ received: true, event, timestamp: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "Webhook processing failed");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ── POST /api/webhooks/kyc ─────────────────────────────────────────────────
router.post("/kyc", async (req, res) => {
  try {
    const { event, data } = req.body as {
      event: string;
      data: { userId: string; status: "approved" | "rejected"; reason?: string };
    };

    req.log.info({ event }, "KYC webhook received");

    if ((event === "kyc.approved" || event === "kyc.rejected") && data?.userId) {
      const { userId, status, reason } = data;
      await db.insert(notificationsTable).values({
        userId,
        title: status === "approved" ? "KYC Verified" : "KYC Rejected",
        message: status === "approved"
          ? "Your identity has been verified. Full trading access is now enabled."
          : `KYC verification was unsuccessful${reason ? `: ${reason}` : ". Please resubmit with valid documents."}`,
        type: status === "approved" ? "success" : "error",
        link: "/kyc",
      });
    }

    res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "KYC webhook failed");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
