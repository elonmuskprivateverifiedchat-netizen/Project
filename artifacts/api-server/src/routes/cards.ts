import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cardRequestsTable, notificationsTable, walletsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();



function generateCardNumber(): string {
  const prefix = "4539"; // Visa-style
  let num = prefix;
  for (let i = 0; i < 12; i++) num += Math.floor(Math.random() * 10);
  return num.replace(/(.{4})/g, "$1 ").trim();
}

function generateExpiry(): string {
  const now = new Date();
  const year = now.getFullYear() + 3 + Math.floor(Math.random() * 2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${month}/${String(year).slice(2)}`;
}

// GET /api/cards
router.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const cards = await db.select().from(cardRequestsTable).where(eq(cardRequestsTable.userId, userId));
    res.json(cards.map(c => ({
      id: c.id,
      cardType: c.cardType,
      cardTier: c.cardTier,
      cardholderName: c.cardholderName,
      status: c.status,
      cardNumber: c.cardNumber ?? null,
      expiryDate: c.expiryDate ?? null,
      cvv: c.status === "active" ? c.cvv : null,
      spendLimit: Number(c.spendLimit),
      billingCountry: c.billingCountry,
      design: c.design ? JSON.parse(c.design) : null,
      createdAt: c.createdAt.toISOString(),
      approvedAt: c.approvedAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get cards");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/cards/request
router.post("/request", async (req, res) => {
  try {
    const userId = req.userId;
    const { cardType, cardTier, cardholderName, billingAddress, billingCity, billingCountry } = req.body;

    if (!cardholderName || !billingAddress || !billingCity || !billingCountry) {
      res.status(400).json({ error: "All billing details are required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user?.kycVerified) {
      res.status(403).json({ error: "KYC approval is required before requesting a card" });
      return;
    }
    if (user.fullName.trim().toLowerCase() !== String(cardholderName).trim().toLowerCase()) {
      res.status(400).json({ error: "Cardholder name must match your registered account name" });
      return;
    }

    // Check for existing pending/active cards
    const existing = await db.select().from(cardRequestsTable)
      .where(eq(cardRequestsTable.userId, userId));
    const hasActive = existing.find(c => ["pending", "active", "approved"].includes(c.status));
    if (hasActive) {
      res.status(409).json({ error: "You already have an active card request" });
      return;
    }

    const spendLimits: Record<string, string> = {
      standard: "5000",
      gold: "15000",
      platinum: "50000",
      black: "unlimited",
    };

    const [card] = await db.insert(cardRequestsTable).values({
      userId,
      cardType: cardType || "virtual",
      cardTier: cardTier || "standard",
      cardholderName,
      billingAddress,
      billingCity,
      billingCountry,
      spendLimit: spendLimits[cardTier || "standard"] || "5000",
      status: "pending",
    }).returning();

    // Notification
    await db.insert(notificationsTable).values({
      userId,
      title: "Card Application Submitted",
      message: `Your ${cardTier || "Standard"} ${cardType || "Virtual"} card application is under review. Expected approval: 1-3 business days.`,
      type: "info",
      link: "/cards",
    });

    res.status(201).json({
      success: true,
      cardId: card.id,
      message: "Card application submitted successfully",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to request card");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/design", async (req, res) => {
  try {
    const { design, mode } = req.body;
    const [card] = await db.select().from(cardRequestsTable).where(eq(cardRequestsTable.id, req.params.id));
    if (!card || card.userId !== req.userId) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    if (card.status !== "active") {
      res.status(403).json({ error: "Card design can only be customized after approval" });
      return;
    }
    const generatedDesign = mode === "bot"
      ? {
          theme: "Bot Generated",
          primary: "#14b8a6",
          secondary: "#0f172a",
          pattern: "neural-wave",
          signature: "ExpressPro AI Guardian",
        }
      : design;
    await db.update(cardRequestsTable).set({ design: JSON.stringify(generatedDesign) }).where(eq(cardRequestsTable.id, card.id));
    res.json({ success: true, design: generatedDesign });
  } catch (err) {
    req.log.error({ err }, "Failed to customize card");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
