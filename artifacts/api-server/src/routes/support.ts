import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { supportTicketsTable, messagesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();


router.get("/tickets", async (req, res) => {
  try {
    const tickets = await db.select().from(supportTicketsTable)
      .where(eq(supportTicketsTable.userId, req.userId))
      .orderBy(supportTicketsTable.createdAt);

    const result = await Promise.all(tickets.map(async (ticket) => {
      const messages = await db.select().from(messagesTable)
        .where(eq(messagesTable.contextId, ticket.id))
        .orderBy(messagesTable.createdAt);

      return {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        messages: messages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          senderAvatar: m.senderAvatar ?? null,
          content: m.content,
          context: m.context,
          contextId: m.contextId ?? null,
          isFromUser: m.isFromUser,
          createdAt: m.createdAt.toISOString(),
        })),
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      };
    }));

    res.json(result.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get support tickets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tickets", async (req, res) => {
  try {
    const { subject, message, priority } = req.body;
    if (!subject || !message) {
      res.status(400).json({ error: "subject and message required" });
      return;
    }

    const [ticket] = await db.insert(supportTicketsTable).values({
      userId: req.userId,
      subject,
      status: "open",
      priority: priority ?? "medium",
    }).returning();

    await db.insert(messagesTable).values({
      senderId: req.userId,
      senderName: "User",
      content: message,
      context: "support",
      contextId: ticket.id,
      isFromUser: true,
    });

    setTimeout(async () => {
      try {
        await db.insert(messagesTable).values({
          senderId: "00000000-0000-0000-0000-000000000099",
          senderName: "EXPRESSPRO101 Support",
          content: "Thank you for contacting EXPRESSPRO101.com support. We have received your ticket and will respond within 24 hours. Reference: #" + ticket.id.slice(0, 8).toUpperCase(),
          context: "support",
          contextId: ticket.id,
          isFromUser: false,
        });
      } catch (_) {}
    }, 2000);

    res.json({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      messages: [],
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create support ticket");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
