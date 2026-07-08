import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.isAdmin) { next(); return; }

    const adminKey = req.headers["x-admin-key"] as string | undefined;
    if (adminKey && adminKey === (process.env.ADMIN_ACCESS_CODE ?? "")) {
      next(); return;
    }

    if (req.userId) {
      const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, req.userId));
      if (user?.role === "admin") { next(); return; }
    }

    res.status(403).json({ error: "Forbidden", message: "Admin access required", code: 403, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
