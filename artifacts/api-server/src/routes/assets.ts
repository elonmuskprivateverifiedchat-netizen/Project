import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { assetCatalogTable, walletsTable, transactionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();


router.get("/catalog", async (req, res) => {
  try {
    const assets = await db.select().from(assetCatalogTable)
      .where(eq(assetCatalogTable.available, true));
    res.json(assets.map(a => ({
      id: a.id,
      symbol: a.symbol,
      name: a.name,
      price: Number(a.price),
      currency: a.currency,
      change24h: Number(a.change24h),
      logoUrl: a.logoUrl ?? null,
      available: a.available,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get asset catalog");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/purchase", async (req, res) => {
  try {
    const { assetId, amount, paymentMethod } = req.body;
    const assets = await db.select().from(assetCatalogTable).where(eq(assetCatalogTable.id, assetId));
    if (!assets.length) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    const asset = assets[0];
    const totalCost = amount * Number(asset.price);
    if (paymentMethod === "moonpay" || paymentMethod === "card" || paymentMethod === "bank_transfer") {
      const moonpayUrl = `https://buy.moonpay.com/?currencyCode=${encodeURIComponent(asset.symbol.toLowerCase())}&baseCurrencyAmount=${encodeURIComponent(String(totalCost.toFixed(2)))}&baseCurrencyCode=usd`;
      res.json({
        success: true,
        redirectUrl: moonpayUrl,
        assetSymbol: asset.symbol,
        amountPurchased: amount,
        totalCost,
        message: "Continue securely with MoonPay to complete this purchase.",
      });
      return;
    }

    if (paymentMethod === "main_wallet") {
      const mainWallets = await db.select().from(walletsTable)
        .where(and(eq(walletsTable.userId, req.userId), eq(walletsTable.type, "main")));

      if (mainWallets.length && Number(mainWallets[0].balance) >= totalCost) {
        const newBalance = Number(mainWallets[0].balance) - totalCost;
        await db.update(walletsTable)
          .set({ balance: newBalance.toFixed(8) })
          .where(eq(walletsTable.id, mainWallets[0].id));

        await db.insert(transactionsTable).values({
          walletId: mainWallets[0].id,
          userId: req.userId,
          type: "withdrawal",
          amount: totalCost.toFixed(8),
          currency: "USD",
          status: "completed",
          description: `Purchased ${amount} ${asset.symbol}`,
        });
      }
    }

    const transactionId = randomUUID();
    res.json({
      success: true,
      transactionId,
      assetSymbol: asset.symbol,
      amountPurchased: amount,
      totalCost,
      message: `Successfully purchased ${amount} ${asset.symbol} for $${totalCost.toFixed(2)}`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to purchase asset");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
