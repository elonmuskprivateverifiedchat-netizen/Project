import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { managersTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();


const formatManager = (m: typeof managersTable.$inferSelect) => ({
  id: m.id,
  name: m.name,
  avatarUrl: m.avatarUrl ?? undefined,
  title: m.title,
  experience: m.experience,
  strategy: m.strategy,
  performance: Number(m.performance),
  totalClients: m.totalClients,
  winRate: Number(m.winRate),
  specialization: m.specialization,
  bio: m.bio,
  contactEmail: m.contactEmail,
  available: m.available,
});

router.get("/", async (req, res) => {
  try {
    const managers = await db.select().from(managersTable);
    res.json(managers.map(formatManager));
  } catch (err) {
    req.log.error({ err }, "Failed to get managers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/selected", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (!users.length || !users[0].selectedManagerId) {
      res.json({ manager: null });
      return;
    }
    const managers = await db.select().from(managersTable)
      .where(eq(managersTable.id, users[0].selectedManagerId));
    res.json({ manager: managers.length ? formatManager(managers[0]) : null });
  } catch (err) {
    req.log.error({ err }, "Failed to get selected manager");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/selected", async (req, res) => {
  try {
    const { managerId } = req.body;
    if (!managerId) {
      res.status(400).json({ error: "managerId required" });
      return;
    }
    await db.update(usersTable)
      .set({ selectedManagerId: managerId })
      .where(eq(usersTable.id, req.userId));
    res.json({ success: true, message: "Account manager selected successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to select manager");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
