import { format, addDays } from "date-fns";
import { getDb } from "./db";
import { getCustomersToRecover, getTomorrowAppointmentsForReminder } from "./rules";
import {
  sendRecoveryMessage,
  sendReminderMessage,
} from "./whatsapp";
import { syncEmptySlotsNextDays } from "./slots";
import type { Customer } from "./types";

export interface CronRunResult {
  barberId: number;
  recovery: { eligible: number; sent: number; skipped: number };
  reminders: { eligible: number; sent: number };
  slots: { synced: number };
}

function logCronRun(
  barberId: number,
  jobType: string,
  details: Record<string, unknown>
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO cron_runs (barber_id, job_type, details) VALUES (?, ?, ?)`
  ).run(barberId, jobType, JSON.stringify(details));
}

export async function runBarberCron(barberId: number): Promise<CronRunResult> {
  const db = getDb();

  const recoveryResult = { eligible: 0, sent: 0, skipped: 0 };
  const toRecover = getCustomersToRecover(barberId);
  recoveryResult.eligible = toRecover.length;

  const sevenDaysAgo = format(addDays(new Date(), -7), "yyyy-MM-dd");

  for (const customer of toRecover) {
    const recent = db
      .prepare(
        `SELECT id FROM whatsapp_messages 
         WHERE barber_id = ? AND customer_id = ? AND message_type = 'recupero'
         AND date(created_at) >= date(?)
         LIMIT 1`
      )
      .get(barberId, customer.id, sevenDaysAgo);

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
      db.prepare(
        `UPDATE customers SET recovery_sent_at = datetime('now') WHERE id = ? AND barber_id = ?`
      ).run(customer.id, barberId);
    }
  }

  const reminderResult = { eligible: 0, sent: 0 };
  const tomorrowAppts = getTomorrowAppointmentsForReminder(barberId);
  reminderResult.eligible = tomorrowAppts.length;

  for (const appt of tomorrowAppts) {
    if (appt.reminder_sent_at) continue;

    const customer = db
      .prepare(
        `SELECT * FROM customers WHERE id = ? AND barber_id = ?`
      )
      .get(appt.customer_id, barberId) as Customer | undefined;

    if (!customer) continue;

    const result = await sendReminderMessage(
      barberId,
      customer.id,
      customer.name,
      customer.phone,
      appt.time,
      appt.date
    );

    if (result.status !== "failed") {
      reminderResult.sent++;
      db.prepare(
        `UPDATE appointments SET reminder_sent_at = datetime('now') WHERE id = ? AND barber_id = ?`
      ).run(appt.id, barberId);
    }
  }

  const slotsSynced = syncEmptySlotsNextDays(barberId, 7);

  const result: CronRunResult = {
    barberId,
    recovery: recoveryResult,
    reminders: reminderResult,
    slots: { synced: slotsSynced },
  };

  logCronRun(barberId, "daily", result as unknown as Record<string, unknown>);
  return result;
}

export async function runAllBarbersCron(): Promise<CronRunResult[]> {
  const db = getDb();
  const barbers = db
    .prepare("SELECT id FROM barbers")
    .all() as { id: number }[];

  const results: CronRunResult[] = [];
  for (const b of barbers) {
    results.push(await runBarberCron(b.id));
  }
  return results;
}
