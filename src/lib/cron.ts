import { format, addDays } from "date-fns";
import { getDb } from "./db";
import { getCustomersToRecover, getTomorrowAppointmentsForReminder } from "./rules";
import { sendRecoveryMessage, sendReminderMessage } from "./whatsapp";
import { computeSlotsNextDays } from "./slots";
import { logger } from "./logger";
import type { Customer } from "./types";

export interface CronRunResult {
  barberId: number;
  recovery: { eligible: number; sent: number; skipped: number };
  reminders: { eligible: number; sent: number };
  slots: { computed: number };
}

async function logCronRun(
  barberId: number,
  jobType: string,
  details: Record<string, unknown>
) {
  const db = await getDb();
  const detailsStr = JSON.stringify(details);
  await db.run(
    `INSERT INTO cron_runs (barber_id, job_type, details) VALUES (?, ?, ?)`,
    [barberId, jobType, detailsStr]
  );
}

export async function runBarberCron(barberId: number): Promise<CronRunResult> {
  const db = await getDb();
  const recoveryResult = { eligible: 0, sent: 0, skipped: 0 };
  const toRecover = await getCustomersToRecover(barberId);
  recoveryResult.eligible = toRecover.length;

  const sevenDaysAgo = format(addDays(new Date(), -7), "yyyy-MM-dd");

  for (const customer of toRecover) {
    const recent = await db.get<{ id: string }>(
      `SELECT id FROM whatsapp_messages 
       WHERE barber_id = ? AND customer_id = ? AND message_type = 'recupero'
       AND date(created_at) >= date(?)
       LIMIT 1`,
      [barberId, customer.id, sevenDaysAgo]
    );

    if (recent) {
      recoveryResult.skipped++;
      continue;
    }

    const result = await sendRecoveryMessage(
      barberId,
      customer.id,
      customer.name,
      customer.phone
    );
    if (result.status !== "failed") {
      recoveryResult.sent++;
      await db
        .run(
          `UPDATE customers SET recovery_sent_at = CURRENT_TIMESTAMP WHERE id = ? AND barber_id = ?`,
          [customer.id, barberId]
        )
        .catch(() =>
          db.run(
            `UPDATE customers SET recovery_sent_at = datetime('now') WHERE id = ? AND barber_id = ?`,
            [customer.id, barberId]
          )
        );
    }
  }

  const reminderResult = { eligible: 0, sent: 0 };
  const tomorrowAppts = await getTomorrowAppointmentsForReminder(barberId);
  reminderResult.eligible = tomorrowAppts.length;

  for (const appt of tomorrowAppts) {
    if (appt.reminder_sent_at) continue;

    const customer = await db.get<Customer>(
      `SELECT * FROM customers WHERE id = ? AND barber_id = ?`,
      [appt.customer_id, barberId]
    );
    if (!customer) continue;

    const result = await sendReminderMessage(
      barberId,
      customer.id,
      customer.name,
      customer.phone,
      appt.time,
      String(appt.date)
    );

    if (result.status !== "failed") {
      reminderResult.sent++;
      await db
        .run(
          `UPDATE appointments SET reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ? AND barber_id = ?`,
          [appt.id, barberId]
        )
        .catch(() =>
          db.run(
            `UPDATE appointments SET reminder_sent_at = datetime('now') WHERE id = ? AND barber_id = ?`,
            [appt.id, barberId]
          )
        );
    }
  }

  const slots = await computeSlotsNextDays(barberId, 7);

  const result: CronRunResult = {
    barberId,
    recovery: recoveryResult,
    reminders: reminderResult,
    slots: { computed: slots.length },
  };

  await logCronRun(barberId, "daily", result as unknown as Record<string, unknown>);
  logger.info("cron_completed", { barberId, result });
  return result;
}

export async function runAllBarbersCron(): Promise<CronRunResult[]> {
  if (!process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("CRON_SECRET non configurato");
  }

  const db = await getDb();
  const barbers = await db.all<{ id: number }>("SELECT id FROM barbers");
  const results: CronRunResult[] = [];
  for (const b of barbers) {
    results.push(await runBarberCron(b.id));
  }
  return results;
}
