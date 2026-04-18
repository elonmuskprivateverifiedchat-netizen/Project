import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { messagesTable, usersTable, managersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();


const formatMessage = (m: typeof messagesTable.$inferSelect) => ({
  id: m.id,
  senderId: m.senderId,
  senderName: m.senderName,
  senderAvatar: m.senderAvatar ?? null,
  content: m.content,
  context: m.context,
  contextId: m.contextId ?? null,
  isFromUser: m.isFromUser,
  createdAt: m.createdAt.toISOString(),
});

router.get("/", async (req, res) => {
  try {
    const { context, contextId } = req.query as { context?: string; contextId?: string };
    let query = db.select().from(messagesTable).$dynamic();

    const conditions = [];
    if (context) conditions.push(eq(messagesTable.context, context as any));
    if (contextId) conditions.push(eq(messagesTable.contextId, contextId));

    const messages = conditions.length
      ? await query.where(and(...conditions)).orderBy(messagesTable.createdAt)
      : await query.orderBy(messagesTable.createdAt);

    res.json(messages.map(formatMessage));
  } catch (err) {
    req.log.error({ err }, "Failed to get messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { content, context, contextId } = req.body;
    if (!content || !context) {
      res.status(400).json({ error: "content and context required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    const user = users[0];

    const [msg] = await db.insert(messagesTable).values({
      senderId: req.userId,
      senderName: user?.fullName ?? "User",
      senderAvatar: user?.avatarUrl ?? null,
      content,
      context,
      contextId: contextId ?? null,
      isFromUser: true,
    }).returning();

    res.json(formatMessage(msg));

    // Simulate manager/support auto-reply after delay
    setTimeout(async () => {
      try {
        let replyName = "Support Team";
        let replyContent = "Thank you for your message. Our team will review and respond shortly.";

        if (context === "manager") {
          const managers = await db.select().from(managersTable).limit(1);
          if (managers.length) {
            replyName = managers[0].name;
            replyContent = "Hello! Thanks for reaching out. I'll review your portfolio and get back to you with recommendations shortly.";
          }
        } else if (context === "support") {
          const moneyRelated = /\b(withdraw|withdrawal|deposit|cash|money|bank|transfer|receive|send|payment|paid|fee|balance)\b/i.test(content);
          replyContent = moneyRelated
            ? "I can guide you, but I cannot process or approve money movement. A representative will review this request before any cash, bank, wallet, or balance action is taken."
            : "I am the account support bot. I can help with navigation, KYC steps, wallet setup, P2P registration, program information, and general account guidance. How else can I guide you?";
        }

        await db.insert(messagesTable).values({
          senderId: "00000000-0000-0000-0000-000000000099",
          senderName: replyName,
          senderAvatar: null,
          content: replyContent,
          context,
          contextId: contextId ?? null,
          isFromUser: false,
        });
      } catch (_) {}
    }, 3000);

  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
