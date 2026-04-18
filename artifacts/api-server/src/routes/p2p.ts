import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  p2pListingsTable, p2pOrdersTable, p2pNotificationsTable,
  p2pChatTable, notificationsTable, usersTable
} from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";

const router: IRouter = Router();

async function getP2PStatus(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const eligible = user?.role === "vendor" || user?.role === "admin";
  return { eligible, role: user?.role ?? "user", status: eligible ? "approved" : "pending_approval" };
}

router.get("/vendor/status", async (req, res) => {
  try {
    res.json(await getP2PStatus(req.userId));
  } catch (err) {
    req.log.error({ err }, "Failed to get P2P vendor status");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vendor/register", async (req, res) => {
  try {
    await db.insert(notificationsTable).values({
      userId: req.userId,
      title: "P2P Merchant Registration Pending",
      message: "Your P2P merchant request is pending company approval. You can create country-based payment methods after approval.",
      type: "info",
      link: "/p2p",
    });
    res.json({ success: true, status: "pending" });
  } catch (err) {
    req.log.error({ err }, "Failed to register P2P vendor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/payment-methods", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    const country = (user?.country || "United States").toLowerCase();
    const methods = country.includes("united kingdom") || country === "uk"
      ? ["Faster Payments", "CHAPS", "Bank Transfer", "Wise", "Debit Card"]
      : country.includes("nigeria")
      ? ["Bank Transfer", "USSD", "Opay", "PalmPay", "Debit Card"]
      : country.includes("kenya")
      ? ["M-Pesa", "Bank Transfer", "Airtel Money", "Debit Card"]
      : ["Bank Transfer", "Debit Card", "Wire Transfer", "PayPal", "Wise"];
    res.json({ country: user?.country || "United States", methods });
  } catch (err) {
    req.log.error({ err }, "Failed to get P2P payment methods");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/listings", async (req, res) => {
  try {
    const { type, asset } = req.query as { type?: string; asset?: string };
    const listings = await db.select().from(p2pListingsTable)
      .where(eq(p2pListingsTable.status, "active"))
      .orderBy(p2pListingsTable.createdAt);

    let filtered = listings;
    if (type) filtered = filtered.filter(l => l.type === type);
    if (asset) filtered = filtered.filter(l => l.asset === asset);

    res.json(filtered.map(l => ({
      id: l.id,
      userId: l.userId,
      userName: l.userName,
      userAvatarUrl: l.userAvatarUrl ?? null,
      type: l.type,
      asset: l.asset,
      amount: Number(l.amount),
      price: Number(l.price),
      currency: l.currency,
      minOrder: Number(l.minOrder),
      maxOrder: Number(l.maxOrder),
      paymentMethods: l.paymentMethods,
      completionRate: Number(l.completionRate),
      totalTrades: l.totalTrades,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
    })).reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get P2P listings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/listings", async (req, res) => {
  try {
    const userId = req.userId;
    const vendorStatus = await getP2PStatus(userId);
    if (!vendorStatus.eligible) {
      res.status(403).json({ error: "Register as a P2P merchant/vendor before creating listings" });
      return;
    }
    const { type, asset, amount, price, currency, minOrder, maxOrder, paymentMethods, userName } = req.body;
    const [listing] = await db.insert(p2pListingsTable).values({
      userId,
      userName: userName || "Trader",
      type,
      asset,
      amount: String(amount),
      price: String(price),
      currency,
      minOrder: String(minOrder),
      maxOrder: String(maxOrder),
      paymentMethods,
      completionRate: "98.00",
      totalTrades: 45,
      status: "active",
    }).returning();

    res.json({
      id: listing.id,
      userId: listing.userId,
      userName: listing.userName,
      userAvatarUrl: listing.userAvatarUrl ?? null,
      type: listing.type,
      asset: listing.asset,
      amount: Number(listing.amount),
      price: Number(listing.price),
      currency: listing.currency,
      minOrder: Number(listing.minOrder),
      maxOrder: Number(listing.maxOrder),
      paymentMethods: listing.paymentMethods,
      completionRate: Number(listing.completionRate),
      totalTrades: listing.totalTrades,
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create P2P listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const userId = req.userId;
    const orders = await db.select().from(p2pOrdersTable)
      .where(or(
        eq(p2pOrdersTable.buyerId, userId),
        eq(p2pOrdersTable.sellerId, userId)
      ))
      .orderBy(p2pOrdersTable.createdAt);

    res.json(orders.map(o => ({
      id: o.id,
      listingId: o.listingId,
      buyerId: o.buyerId,
      sellerId: o.sellerId,
      asset: o.asset,
      amount: Number(o.amount),
      price: Number(o.price),
      currency: o.currency,
      status: o.status,
      proofUrl: (o as any).proofUrl ?? null,
      createdAt: o.createdAt.toISOString(),
    })).reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get P2P orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const userId = req.userId;
    const vendorStatus = await getP2PStatus(userId);
    if (!vendorStatus.eligible) {
      res.status(403).json({ error: "Register as a P2P merchant/vendor before using P2P trading" });
      return;
    }
    const { listingId, amount } = req.body;
    const listings = await db.select().from(p2pListingsTable).where(eq(p2pListingsTable.id, listingId));
    if (!listings.length) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const listing = listings[0];
    const [order] = await db.insert(p2pOrdersTable).values({
      listingId,
      buyerId: userId,
      sellerId: listing.userId,
      asset: listing.asset,
      amount: String(amount),
      price: listing.price,
      currency: listing.currency,
      status: "pending",
    }).returning();

    // Notify buyer
    await db.insert(p2pNotificationsTable).values({
      userId,
      type: "deposit_incoming",
      title: "New P2P Order",
      message: `Your order for ${amount} ${listing.asset} at $${listing.price} is now pending. Please send payment.`,
      orderId: order.id,
      read: false,
    });

    // Notify vendor
    await db.insert(notificationsTable).values({
      userId: listing.userId,
      title: "New P2P Order Received",
      message: `A buyer wants to purchase ${amount} ${listing.asset} from your listing. Waiting for payment confirmation.`,
      type: "info",
      link: "/p2p",
    });

    // Add welcome chat message
    await db.insert(p2pChatTable).values({
      orderId: order.id,
      senderId: listing.userId,
      senderName: listing.userName,
      message: `Hello! Please send ${listing.currency} ${(Number(amount) * Number(listing.price)).toFixed(2)} to confirm this trade. Send proof of payment once done.`,
    });

    res.json({
      id: order.id,
      listingId: order.listingId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      asset: order.asset,
      amount: Number(order.amount),
      price: Number(order.price),
      currency: order.currency,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create P2P order");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/p2p/orders/:id/status — update order status
router.patch("/orders/:id/status", async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.body;

    await db.update(p2pOrdersTable).set({ status }).where(eq(p2pOrdersTable.id, req.params.id));

    // Notify both parties
    await db.insert(p2pNotificationsTable).values({
      userId,
      type: "order_update",
      title: "Order Updated",
      message: `Order status changed to: ${status}`,
      orderId: req.params.id,
      read: false,
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update order status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/p2p/orders/:id/proof — upload proof of payment (mock URL)
router.post("/orders/:id/proof", async (req, res) => {
  try {
    const userId = req.userId;
    const { proofUrl } = req.body;

    if (!proofUrl) {
      res.status(400).json({ error: "proofUrl is required" });
      return;
    }

    // Update order with proof and change status
    await db.update(p2pOrdersTable).set({ status: "payment_sent" }).where(eq(p2pOrdersTable.id, req.params.id));

    // Notify
    await db.insert(p2pNotificationsTable).values({
      userId,
      type: "order_update",
      title: "Payment Proof Submitted",
      message: "Your payment proof has been submitted. Waiting for vendor confirmation.",
      orderId: req.params.id,
      read: false,
    });

    // Add to chat
    await db.insert(p2pChatTable).values({
      orderId: req.params.id,
      senderId: userId,
      senderName: "You",
      message: "I have sent payment. Please find my proof of payment attached.",
      attachmentUrl: proofUrl,
    });

    res.json({ success: true, message: "Proof submitted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to submit proof");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/p2p/orders/:id/chat
router.get("/orders/:id/chat", async (req, res) => {
  try {
    const messages = await db.select().from(p2pChatTable)
      .where(eq(p2pChatTable.orderId, req.params.id))
      .orderBy(p2pChatTable.createdAt);

    res.json(messages.map(m => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      message: m.message,
      attachmentUrl: m.attachmentUrl ?? null,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get chat messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/p2p/orders/:id/chat
router.post("/orders/:id/chat", async (req, res) => {
  try {
    const userId = req.userId;
    const { message, senderName, attachmentUrl } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const [msg] = await db.insert(p2pChatTable).values({
      orderId: req.params.id,
      senderId: userId,
      senderName: senderName || "Trader",
      message,
      attachmentUrl,
    }).returning();

    res.json({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      message: msg.message,
      attachmentUrl: msg.attachmentUrl ?? null,
      createdAt: msg.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send chat message");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const userId = req.userId;
    const notifications = await db.select().from(p2pNotificationsTable)
      .where(eq(p2pNotificationsTable.userId, userId))
      .orderBy(p2pNotificationsTable.createdAt);

    res.json(notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      orderId: n.orderId ?? null,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })).reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get P2P notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
