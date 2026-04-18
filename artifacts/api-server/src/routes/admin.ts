import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  usersTable, kycDocumentsTable, walletsTable, transactionsTable,
  cardRequestsTable, notificationsTable, p2pListingsTable, p2pOrdersTable, connectedWalletsTable
} from "@workspace/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

const router: IRouter = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // Allow admin sessions (from admin-login endpoint)
    if (req.isAdmin) {
      next();
      return;
    }
    const adminKey = req.headers["x-admin-key"] as string | undefined;
    if (adminKey && adminKey === (process.env.ADMIN_ACCESS_CODE || "EXPRESSPRO101-MGMT-2026")) {
      next();
      return;
    }
    if (req.userId !== "admin-system") {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
      if (user?.role !== "admin") {
        res.status(403).json({ error: "Admin control panel access only" });
        return;
      }
    }
    next();
  } catch (err) {
    req.log.error({ err }, "Failed to verify admin access");
    res.status(500).json({ error: "Internal server error" });
  }
}

router.use(requireAdmin);

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
    const [pendingKyc] = await db.select({ count: sql<number>`count(*)` }).from(kycDocumentsTable)
      .where(eq(kycDocumentsTable.status, "pending"));
    const [totalTx] = await db.select({ count: sql<number>`count(*)` }).from(transactionsTable);
    const [pendingCards] = await db.select({ count: sql<number>`count(*)` }).from(cardRequestsTable)
      .where(eq(cardRequestsTable.status, "pending"));
    const [activeListings] = await db.select({ count: sql<number>`count(*)` }).from(p2pListingsTable)
      .where(eq(p2pListingsTable.status, "active"));
    const [pendingWithdrawals] = await db.select({ count: sql<number>`count(*)` }).from(transactionsTable)
      .where(and(eq(transactionsTable.status, "pending"), eq(transactionsTable.type, "withdrawal")));

    res.json({
      totalUsers: Number(totalUsers.count),
      pendingKyc: Number(pendingKyc.count),
      totalTransactions: Number(totalTx.count),
      pendingCards: Number(pendingCards.count),
      activeP2PListings: Number(activeListings.count),
      pendingWithdrawals: Number(pendingWithdrawals.count),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get admin stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/transactions/:id/withdrawal", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["completed", "failed"].includes(status)) {
      res.status(400).json({ error: "Invalid withdrawal status" });
      return;
    }

    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, req.params.id));
    if (!tx || tx.type !== "withdrawal" || tx.status !== "pending") {
      res.status(404).json({ error: "Pending withdrawal not found" });
      return;
    }

    if (status === "completed") {
      const gasMatch = tx.description.match(/Gas fee: ETH ([0-9.]+)/);
      const gasFee = gasMatch ? Number(gasMatch[1]) : 15;
      const totalDebit = Number(tx.amount);
      const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, tx.walletId));
      if (wallet) {
        const balance = Number(wallet.balance);
        if (balance < totalDebit) {
          res.status(400).json({ error: "Insufficient source wallet balance" });
          return;
        }
        await db.update(walletsTable).set({ balance: (balance - totalDebit).toFixed(8) }).where(eq(walletsTable.id, wallet.id));
      } else {
        const [connected] = await db.select().from(connectedWalletsTable).where(eq(connectedWalletsTable.id, tx.walletId));
        if (!connected) {
          res.status(404).json({ error: "Withdrawal source not found" });
          return;
        }
        const balance = Number(connected.balance);
        if (balance < totalDebit) {
          res.status(400).json({ error: "Insufficient connected wallet balance" });
          return;
        }
        await db.update(connectedWalletsTable).set({ balance: (balance - totalDebit).toFixed(8) }).where(eq(connectedWalletsTable.id, connected.id));
      }
    }

    await db.update(transactionsTable).set({ status }).where(eq(transactionsTable.id, tx.id));
    await db.insert(notificationsTable).values({
      userId: tx.userId,
      title: status === "completed" ? "Withdrawal Approved" : "Withdrawal Rejected",
      message: status === "completed"
        ? "Your withdrawal has been approved and funds have now been deducted from the source wallet."
        : "Your withdrawal request was rejected. Your balance was not deducted.",
      type: status === "completed" ? "success" : "error",
      link: "/wallet",
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to review withdrawal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/cards/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "active", "declined", "hold"].includes(status)) {
      res.status(400).json({ error: "Invalid card status" });
      return;
    }
    const update: any = { status };
    if (status === "active") {
      update.cardNumber = "4539 " + Array.from({ length: 3 }, () => String(Math.floor(1000 + Math.random() * 9000))).join(" ");
      update.expiryDate = "12/30";
      update.cvv = String(Math.floor(100 + Math.random() * 900));
      update.approvedAt = new Date();
    }
    await db.update(cardRequestsTable).set(update).where(eq(cardRequestsTable.id, req.params.id));
    const [card] = await db.select().from(cardRequestsTable).where(eq(cardRequestsTable.id, req.params.id));
    if (card) {
      await db.insert(notificationsTable).values({
        userId: card.userId,
        title: status === "active" ? "Card Request Approved" : status === "declined" ? "Card Request Declined" : "Card Request Updated",
        message: status === "active" ? "Your card is approved. You can now customize the design or let the account bot generate one." : `Your card request is now ${status}.`,
        type: status === "active" ? "success" : status === "declined" ? "error" : "info",
        link: "/cards",
      });
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update card status");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cards", async (req, res) => {
  try {
    const cards = await db.select().from(cardRequestsTable).orderBy(desc(cardRequestsTable.createdAt));
    res.json(cards.map(c => ({
      id: c.id,
      userId: c.userId,
      cardType: c.cardType,
      cardTier: c.cardTier,
      cardholderName: c.cardholderName,
      status: c.status,
      spendLimit: Number(c.spendLimit),
      design: c.design ? JSON.parse(c.design) : null,
      createdAt: c.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get cards");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(100);
    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      country: u.country,
      role: u.role,
      kycStatus: u.kycStatus,
      kycVerified: u.kycVerified,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get users");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/users/:id/kyc
router.patch("/users/:id/kyc", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["verified", "rejected", "pending"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    await db.update(usersTable).set({
      kycStatus: status,
      kycVerified: status === "verified",
    }).where(eq(usersTable.id, req.params.id));

    // Notify user
    await db.insert(notificationsTable).values({
      userId: req.params.id,
      title: `KYC ${status === "verified" ? "Approved" : status === "rejected" ? "Rejected" : "Under Review"}`,
      message: status === "verified"
        ? "Your identity has been verified successfully. You now have full trading access."
        : status === "rejected"
        ? "Your KYC submission was rejected. Please resubmit with clearer documents."
        : "Your KYC is under review.",
      type: status === "verified" ? "success" : status === "rejected" ? "error" : "info",
      link: "/kyc",
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update KYC status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "vendor", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    await db.update(usersTable).set({ role }).where(eq(usersTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update user role");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/transactions
router.get("/transactions", async (req, res) => {
  try {
    const txs = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(200);
    res.json(txs.map(t => ({
      id: t.id,
      userId: t.userId,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/kyc-documents
router.get("/kyc-documents", async (req, res) => {
  try {
    const docs = await db.select({
      doc: kycDocumentsTable,
      user: {
        fullName: usersTable.fullName,
        email: usersTable.email,
      }
    }).from(kycDocumentsTable)
      .leftJoin(usersTable, eq(kycDocumentsTable.userId, usersTable.id))
      .orderBy(desc(kycDocumentsTable.submittedAt));

    res.json(docs.map(d => ({
      id: d.doc.id,
      userId: d.doc.userId,
      userName: d.user?.fullName ?? "Unknown",
      userEmail: d.user?.email ?? "",
      docType: d.doc.docType,
      docUrl: d.doc.docUrl,
      status: d.doc.status,
      reviewNote: d.doc.reviewNote,
      submittedAt: d.doc.submittedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get KYC documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/kyc-documents/:id
router.patch("/kyc-documents/:id", async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    await db.update(kycDocumentsTable).set({
      status,
      reviewNote,
      reviewedAt: new Date(),
    }).where(eq(kycDocumentsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update KYC document");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/cards
router.get("/cards", async (req, res) => {
  try {
    const cards = await db.select({
      card: cardRequestsTable,
      user: { fullName: usersTable.fullName, email: usersTable.email }
    }).from(cardRequestsTable)
      .leftJoin(usersTable, eq(cardRequestsTable.userId, usersTable.id))
      .orderBy(desc(cardRequestsTable.createdAt));

    res.json(cards.map(c => ({
      id: c.card.id,
      userId: c.card.userId,
      userName: c.user?.fullName ?? "Unknown",
      userEmail: c.user?.email ?? "",
      cardType: c.card.cardType,
      cardTier: c.card.cardTier,
      status: c.card.status,
      createdAt: c.card.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get cards");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/users/:id/balance — adjust main wallet balance
router.patch("/users/:id/balance", async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount === undefined || isNaN(parseFloat(amount))) {
      res.status(400).json({ error: "Amount is required" });
      return;
    }
    const adjustAmount = parseFloat(amount);
    const [wallet] = await db.select().from(walletsTable)
      .where(and(eq(walletsTable.userId, req.params.id), eq(walletsTable.type as any, "main")));
    if (!wallet) {
      res.status(404).json({ error: "Main wallet not found" });
      return;
    }
    const newBalance = (Number(wallet.balance) + adjustAmount).toFixed(8);
    await db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.id, wallet.id));

    const [tx] = await db.insert(transactionsTable).values({
      walletId: wallet.id,
      userId: req.params.id,
      type: adjustAmount > 0 ? "deposit" : "withdrawal",
      amount: Math.abs(adjustAmount).toString(),
      currency: wallet.currency,
      status: "completed",
      description: `Admin balance adjustment: ${adjustAmount > 0 ? "+" : ""}${adjustAmount}`,
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.params.id,
      title: adjustAmount > 0 ? "Balance Credited" : "Balance Adjusted",
      message: `Admin has ${adjustAmount > 0 ? "credited" : "adjusted"} your account by ${Math.abs(adjustAmount)} ${wallet.currency}.`,
      type: adjustAmount > 0 ? "success" : "info",
      link: "/wallet",
    });

    res.json({ success: true, newBalance: Number(newBalance) });
  } catch (err) {
    req.log.error({ err }, "Failed to adjust balance");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
