import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { kycDocumentsTable, usersTable, notificationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();



// GET /api/kyc/status
router.get("/status", async (req, res) => {
  try {
    const userId = req.userId;
    const users = await db.select({
      kycStatus: usersTable.kycStatus,
      kycVerified: usersTable.kycVerified,
    }).from(usersTable).where(eq(usersTable.id, userId));

    if (!users.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const docs = await db.select().from(kycDocumentsTable).where(eq(kycDocumentsTable.userId, userId));

    res.json({
      kycStatus: users[0].kycStatus,
      kycVerified: users[0].kycVerified,
      documents: docs.map(d => ({
        id: d.id,
        docType: d.docType,
        status: d.status,
        reviewNote: d.reviewNote,
        submittedAt: d.submittedAt.toISOString(),
        reviewedAt: d.reviewedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get KYC status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/kyc/submit
router.post("/submit", async (req, res) => {
  try {
    const userId = req.userId;
    const { docType, docUrl } = req.body;

    if (!docType || !docUrl) {
      res.status(400).json({ error: "docType and docUrl are required" });
      return;
    }

    // Check for existing doc of same type
    const existing = await db.select().from(kycDocumentsTable)
      .where(eq(kycDocumentsTable.userId, userId));

    const sameType = existing.find(d => d.docType === docType);
    if (sameType) {
      // Update existing
      await db.update(kycDocumentsTable)
        .set({ docUrl, status: "pending", reviewNote: null, reviewedAt: null })
        .where(eq(kycDocumentsTable.id, sameType.id));
    } else {
      await db.insert(kycDocumentsTable).values({ userId, docType, docUrl });
    }

    // Update user KYC status to pending if not already
    const users = await db.select({ kycStatus: usersTable.kycStatus }).from(usersTable).where(eq(usersTable.id, userId));
    if (users[0]?.kycStatus === "unverified") {
      await db.update(usersTable).set({ kycStatus: "pending" }).where(eq(usersTable.id, userId));
    }

    // Notification
    await db.insert(notificationsTable).values({
      userId,
      title: "KYC Document Submitted",
      message: `Your ${docType} document has been submitted for review. We'll notify you within 24 hours.`,
      type: "info",
      link: "/kyc",
    });

    res.json({ success: true, message: "Document submitted for review" });
  } catch (err) {
    req.log.error({ err }, "Failed to submit KYC");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
