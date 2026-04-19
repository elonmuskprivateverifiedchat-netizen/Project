import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { userSessionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      isAdmin?: boolean;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const [session] = await db.select().from(userSessionsTable).where(eq(userSessionsTable.id, token));

    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    if (new Date() > session.expiresAt) {
      await db.delete(userSessionsTable).where(eq(userSessionsTable.id, token));
      res.status(401).json({ error: "Session expired. Please sign in again." });
      return;
    }

    req.userId = session.userId;
    req.isAdmin = session.isAdmin;
    next();
  } catch (err) {
    res.status(500).json({ error: "Session validation failed" });
  }
}
