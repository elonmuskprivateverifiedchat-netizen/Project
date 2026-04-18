import { db } from "@workspace/db";
import { notificationsTable, transactionsTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "./logger";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

async function sendPendingWithdrawalReminders() {
  try {
    const pending = await db.select().from(transactionsTable)
      .where(and(eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "pending")));

    for (const withdrawal of pending) {
      const [recentReminder] = await db.select().from(notificationsTable)
        .where(and(
          eq(notificationsTable.userId, withdrawal.userId),
          eq(notificationsTable.title, "Withdrawal Review Reminder"),
          sql`${notificationsTable.link} = ${`/wallet?withdrawal=${withdrawal.id}`}`,
          sql`${notificationsTable.createdAt} > now() - interval '6 hours'`,
        ))
        .limit(1);

      if (recentReminder) continue;

      await db.insert(notificationsTable).values({
        userId: withdrawal.userId,
        title: "Withdrawal Review Reminder",
        message: `Your withdrawal of ${withdrawal.currency} ${withdrawal.amount} is still pending representative approval.`,
        type: "info",
        link: `/wallet?withdrawal=${withdrawal.id}`,
      });
    }
  } catch (err) {
    logger.error({ err }, "Failed to send withdrawal reminders");
  }
}

export function startWithdrawalReminderJob() {
  setTimeout(sendPendingWithdrawalReminders, 30_000);
  setInterval(sendPendingWithdrawalReminders, SIX_HOURS_MS);
}