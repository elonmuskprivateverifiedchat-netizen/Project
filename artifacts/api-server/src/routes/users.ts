import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();




router.get("/me", async (req, res) => {
  try {
    const userId = req.userId;
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (users.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const user = users[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || "",
      country: user.country,
      role: user.role || "user",
      kycVerified: user.kycVerified,
      kycStatus: user.kycStatus || "unverified",
      emailVerified: user.emailVerified || false,
      phoneVerified: user.phoneVerified || false,
      securityType: user.securityType || "seed",
      demoMode: user.demoMode || false,
      avatarUrl: user.avatarUrl ?? undefined,
      createdAt: user.createdAt.toISOString(),
      selectedManagerId: user.selectedManagerId ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get user");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/users/me — update profile
router.patch("/me", async (req, res) => {
  try {
    const userId = req.userId;
    const { fullName, phone, country } = req.body;

    await db.update(usersTable).set({
      ...(fullName && { fullName }),
      ...(phone && { phone }),
      ...(country && { country }),
      lastActivity: new Date(),
    }).where(eq(usersTable.id, userId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
