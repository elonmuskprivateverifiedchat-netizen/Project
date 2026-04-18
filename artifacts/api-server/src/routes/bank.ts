import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bankAccountsTable, walletsTable, transactionsTable, notificationsTable, usersTable, connectedWalletsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();



// GET /api/bank/accounts
router.get("/accounts", async (req, res) => {
  try {
    const userId = req.userId;
    const accounts = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.userId, userId));
    res.json(accounts.map(a => ({
      id: a.id,
      accountName: a.accountName,
      bankName: a.bankName,
      accountNumber: "****" + a.accountNumber.slice(-4),
      routingNumber: a.routingNumber ? "****" + a.routingNumber.slice(-4) : null,
      iban: a.iban,
      swiftCode: a.swiftCode,
      country: a.country,
      currency: a.currency,
      isDefault: a.isDefault,
      createdAt: a.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get bank accounts");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bank/accounts
router.post("/accounts", async (req, res) => {
  try {
    const userId = req.userId;
    const { accountName, bankName, accountNumber, routingNumber, iban, swiftCode, country, currency, debitCardLast4, debitCardExpiry } = req.body;

    if (!accountName || !bankName || !accountNumber || !country) {
      res.status(400).json({ error: "Account name, bank name, account number, and country are required" });
      return;
    }
    if (!debitCardLast4 || !debitCardExpiry) {
      res.status(400).json({ error: "A debit card linked to this bank account is required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (user && accountName.trim().toLowerCase() !== user.fullName.trim().toLowerCase()) {
      res.status(400).json({ error: "Bank account name must match the registered account name" });
      return;
    }

    // If first account, make it default
    const existing = await db.select({ id: bankAccountsTable.id }).from(bankAccountsTable).where(eq(bankAccountsTable.userId, userId));
    const isDefault = existing.length === 0;

    const [account] = await db.insert(bankAccountsTable).values({
      userId,
      accountName,
      bankName,
      accountNumber,
      routingNumber: routingNumber || "",
      iban,
      swiftCode,
      debitCardLast4: String(debitCardLast4).slice(-4),
      debitCardExpiry,
      country,
      currency: currency || "USDC",
      isDefault,
    }).returning();

    res.status(201).json({ success: true, accountId: account.id, message: "Bank account added" });
  } catch (err) {
    req.log.error({ err }, "Failed to add bank account");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/bank/accounts/:id
router.delete("/accounts/:id", async (req, res) => {
  try {
    const userId = req.userId;
    await db.delete(bankAccountsTable)
      .where(and(eq(bankAccountsTable.id, req.params.id), eq(bankAccountsTable.userId, userId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete bank account");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bank/withdraw
router.post("/withdraw", async (req, res) => {
  try {
    const userId = req.userId;
    const {
      amount,
      accountId,
      connectedWalletId,
      sourceConnectedWalletId,
      destinationConnectedWalletId,
      currency,
      gasFeeEth = 0,
      sourceWalletType = "main",
      destinationType = "bank",
    } = req.body;

    if (!amount) {
      res.status(400).json({ error: "Amount is required" });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    let source: { id: string; balance: string; currency: string; label: string };
    if (sourceWalletType === "connected") {
      const sourceWalletId = sourceConnectedWalletId || connectedWalletId;
      if (!sourceWalletId) {
        res.status(400).json({ error: "Select a saved external wallet source" });
        return;
      }
      const [connected] = await db.select().from(connectedWalletsTable)
        .where(and(eq(connectedWalletsTable.userId, userId), eq(connectedWalletsTable.id, sourceWalletId)));
      if (!connected) {
        res.status(404).json({ error: "Connected wallet not found" });
        return;
      }
      source = { id: connected.id, balance: String(connected.balance), currency: connected.currency, label: `${connected.walletType} wallet` };
    } else {
      const wallets = await db.select().from(walletsTable)
        .where(and(eq(walletsTable.userId, userId), eq(walletsTable.type, "main")));
      if (!wallets.length) {
        res.status(404).json({ error: "Main wallet not found" });
        return;
      }
      const wallet = wallets[0];
      source = { id: wallet.id, balance: String(wallet.balance), currency: wallet.currency, label: sourceWalletType === "fiat" ? "Fiat Cash Wallet" : wallet.label };
    }

    if (parseFloat(source.balance) < withdrawAmount) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    let destinationLabel = "selected destination";
    if (destinationType === "bank") {
      if (!accountId) {
        res.status(400).json({ error: "Select a registered bank account" });
        return;
      }
      const [account] = await db.select().from(bankAccountsTable)
        .where(and(eq(bankAccountsTable.id, accountId), eq(bankAccountsTable.userId, userId)));
      if (!account) {
        res.status(404).json({ error: "Registered bank account not found" });
        return;
      }
      destinationLabel = `${account.bankName} account ending ${account.accountNumber.slice(-4)}`;
    } else {
      const destinationWalletId = destinationConnectedWalletId || connectedWalletId;
      if (!destinationWalletId) {
        res.status(400).json({ error: "Select a saved external wallet address" });
        return;
      }
      const [connected] = await db.select().from(connectedWalletsTable)
        .where(and(eq(connectedWalletsTable.id, destinationWalletId), eq(connectedWalletsTable.userId, userId)));
      if (!connected) {
        res.status(404).json({ error: "Saved external wallet address not found" });
        return;
      }
      destinationLabel = `${connected.walletType} address ${connected.address.slice(0, 8)}...${connected.address.slice(-4)}`;
    }

    const [tx] = await db.insert(transactionsTable).values({
      walletId: source.id,
      userId,
      type: "withdrawal",
      amount: withdrawAmount.toString(),
      currency: currency || source.currency,
      status: "pending",
      description: `Pending withdrawal from ${source.label} to ${destinationLabel}. Gas fee: ETH ${Number(gasFeeEth || 0).toFixed(6)}. Funds will be deducted after representative approval.`,
    }).returning();

    await db.insert(notificationsTable).values({
      userId,
      title: "Withdrawal Pending Approval",
      message: `Your withdrawal of ${currency || source.currency} ${withdrawAmount.toFixed(2)} is pending representative approval. You will receive reminder updates every 6 hours until it is reviewed.`,
      type: "info",
      link: "/wallet",
    });

    res.json({ success: true, transactionId: tx.id, gasFeeEth: Number(gasFeeEth || 0), message: "Withdrawal submitted for approval" });
  } catch (err) {
    req.log.error({ err }, "Failed to process withdrawal");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bank/deposit
router.post("/deposit", async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, method, currency } = req.body;

    if (!amount || !method) {
      res.status(400).json({ error: "Amount and method are required" });
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    // Get main wallet
    const wallets = await db.select().from(walletsTable)
      .where(and(eq(walletsTable.userId, userId), eq(walletsTable.type, "main")));

    if (!wallets.length) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    const wallet = wallets[0];
    const balance = parseFloat(wallet.balance as string);
    const newBalance = (balance + depositAmount).toFixed(2);

    await db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.id, wallet.id));

    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      userId,
      type: "deposit",
      amount: depositAmount.toString(),
      currency: currency || wallet.currency,
      status: "completed",
      description: `Deposit via ${method}`,
    });

    await db.insert(notificationsTable).values({
      userId,
      title: "Deposit Successful",
      message: `${currency || wallet.currency} ${depositAmount.toFixed(2)} has been credited to your main wallet.`,
      type: "success",
      link: "/wallet",
    });

    res.json({ success: true, message: "Deposit processed successfully", newBalance });
  } catch (err) {
    req.log.error({ err }, "Failed to process deposit");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
