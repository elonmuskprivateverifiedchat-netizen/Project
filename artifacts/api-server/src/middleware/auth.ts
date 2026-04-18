import type { Request, Response, NextFunction } from "express";
import { sessions } from "../routes/auth";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      isAdmin?: boolean;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const session = sessions.get(token);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  if (Date.now() - session.createdAt > 60 * 60 * 1000) {
    sessions.delete(token);
    res.status(401).json({ error: "Session expired" });
    return;
  }

  session.createdAt = Date.now();
  req.userId = session.userId;
  req.isAdmin = session.isAdmin || false;
  next();
}
