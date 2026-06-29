import { v4 as uuid } from "uuid";
import { getDb } from "./db";
import {
  broadcastRecoveryMessages,
  broadcastSlotToActiveCustomers,
  sendRecoveryMessage,
  sendReminderMessage,
  sendWhatsAppMessage,
  summarizeSendResults,
} from "./whatsapp";
import { WHATSAPP_TEMPLATES } from "./constants";
import {
  getCustomersToRecover,
  getNoShowAtRisk,
  getPendingRequests,
} from "./rules";
import { markSlotPublished, parseSlotId } from "./slots";
import type { ActionResult, Customer } from "./types";

export async function actionFaiGuadagnare(barberId: number) {
  const customers = await getCustomersToRecover(barberId);
  const noShows = await getNoShowAtRisk(barberId);
  const db = await getDb();

  const recoveryResults = await broadcastRecoveryMessages(
    barberId,
    customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
  );

  const reminderResults = [];
  for (const appt of noShows) {
    const customer = await db.get<Customer>(
      "SELECT * FROM customers WHERE id = ? AND barber_id = ?",
      [appt.customer_id, barberId]
    );
    if (customer) {
      reminderResults.push(
        await sendReminderMessage(
          barberId,
          customer.id,
          customer.name,
          customer.phone,
          appt.time
        )
      );
    }
  }

  const allResults = [...recoveryResults, ...reminderResults];
  const summary = summarizeSendResults(allResults);

  if (summary.simulated > 0 || summary.sent > 0) {
    await db.run(
      `UPDATE monthly_stats SET recovered_customers = recovered_customers + ? WHERE barber_id = ?`,
      [
        recoveryResults.filter((r) => r.status !== "failed").length,
        barberId,
      ]
    );
  }

  return {
    ...summary,
    recoverySent: recoveryResults.filter((r) => r.status !== "failed").length,
    remindersSent: reminderResults.filter((r) => r.status !== "failed").length,
  };
}

export async function actionSendReminders(barberId: number): Promise<ActionResult> {
  const noShows = await getNoShowAtRisk(barberId);
  const db = await getDb();
  const results = [];

  for (const appt of noShows) {
    const customer = await db.get<Customer>(
      "SELECT * FROM customers WHERE id = ? AND barber_id = ?",
      [appt.customer_id, barberId]
    );
    if (customer) {
      results.push(
        await sendReminderMessage(
          barberId,
          customer.id,
          customer.name,
          customer.phone,
          appt.time
        )
      );
    }
  }

  return { ...summarizeSendResults(results), results };
}

export async function actionRecoverCustomer(barberId: number, customerId: string) {
  const db = await getDb();
  const customer = await db.get<Customer>(
    "SELECT * FROM customers WHERE id = ? AND barber_id = ?",
    [customerId, barberId]
  );
  if (!customer) throw new Error("Cliente non trovato");

  const result = await sendRecoveryMessage(
    barberId,
    customer.id,
    customer.name,
    customer.phone
  );

  if (result.status !== "failed") {
    await db.run(
      `UPDATE customers SET recovery_sent_at = CURRENT_TIMESTAMP WHERE id = ? AND barber_id = ?`,
      [customerId, barberId]
    ).catch(() =>
      db.run(
        `UPDATE customers SET recovery_sent_at = datetime('now') WHERE id = ? AND barber_id = ?`,
        [customerId, barberId]
      )
    );
    await db.run(
      `UPDATE monthly_stats SET recovered_customers = recovered_customers + 1 WHERE barber_id = ?`,
      [barberId]
    );
  }

  return result;
}

export async function actionSendReminder(barberId: number, appointmentId: string) {
  const db = await getDb();
  const appt = await db.get<{ customer_id: string; time: string }>(
    `SELECT customer_id, time FROM appointments WHERE id = ? AND barber_id = ?`,
    [appointmentId, barberId]
  );
  if (!appt) throw new Error("Appuntamento non trovato");

  const customer = await db.get<Customer>(
    "SELECT * FROM customers WHERE id = ? AND barber_id = ?",
    [appt.customer_id, barberId]
  );
  if (!customer) throw new Error("Cliente non trovato");

  return sendReminderMessage(
    barberId,
    customer.id,
    customer.name,
    customer.phone,
    appt.time
  );
}

export async function actionPublishSlot(barberId: number, slotId: string) {
  const { date, startTime } = parseSlotId(decodeURIComponent(slotId));
  const results = await broadcastSlotToActiveCustomers(barberId, startTime);
  const summary = summarizeSendResults(results);

  if (summary.success || summary.simulated > 0) {
    await markSlotPublished(barberId, date, startTime);
    const db = await getDb();
    await db.run(
      `UPDATE monthly_stats SET slots_filled = slots_filled + 1 WHERE barber_id = ?`,
      [barberId]
    );
  }

  return { ...summary, results };
}

export async function actionAcceptRequest(barberId: number, requestId: string) {
  const db = await getDb();
  const request = await db.get<{
    customer_id: string;
    customer_name: string;
    customer_phone: string;
    requested_date: string;
    requested_time: string;
  }>(
    `SELECT * FROM appointment_requests WHERE id = ? AND barber_id = ?`,
    [requestId, barberId]
  );
  if (!request) throw new Error("Richiesta non trovata");

  const apptId = uuid();
  await db.run(
    `INSERT INTO appointments (id, barber_id, customer_id, customer_name, date, time, status)
     VALUES (?, ?, ?, ?, ?, ?, 'confermato')`,
    [
      apptId,
      barberId,
      request.customer_id,
      request.customer_name,
      request.requested_date,
      request.requested_time,
    ]
  );

  await db.run(
    `UPDATE appointment_requests SET status = 'accettata' WHERE id = ? AND barber_id = ?`,
    [requestId, barberId]
  );

  const content = WHATSAPP_TEMPLATES.richiesta_accettata(
    request.customer_name,
    String(request.requested_date),
    request.requested_time
  );

  return sendWhatsAppMessage(
    barberId,
    request.customer_phone,
    request.customer_name,
    request.customer_id,
    "richiesta_accettata",
    content
  );
}

export async function actionRejectRequest(barberId: number, requestId: string) {
  const db = await getDb();
  const request = await db.get<{
    customer_id: string;
    customer_name: string;
    customer_phone: string;
  }>(
    `SELECT customer_id, customer_name, customer_phone FROM appointment_requests WHERE id = ? AND barber_id = ?`,
    [requestId, barberId]
  );
  if (!request) throw new Error("Richiesta non trovata");

  await db.run(
    `UPDATE appointment_requests SET status = 'rifiutata' WHERE id = ? AND barber_id = ?`,
    [requestId, barberId]
  );

  return sendWhatsAppMessage(
    barberId,
    request.customer_phone,
    request.customer_name,
    request.customer_id,
    "richiesta_rifiutata",
    WHATSAPP_TEMPLATES.richiesta_rifiutata(request.customer_name)
  );
}

export async function actionCreateAppointment(
  barberId: number,
  data: {
    customerId: string;
    date: string;
    time: string;
    durationMinutes?: number;
    notes?: string;
  }
) {
  const db = await getDb();
  const customer = await db.get<Customer>(
    "SELECT * FROM customers WHERE id = ? AND barber_id = ?",
    [data.customerId, barberId]
  );
  if (!customer) throw new Error("Cliente non trovato");

  const id = uuid();
  await db.run(
    `INSERT INTO appointments (id, barber_id, customer_id, customer_name, date, time, duration_minutes, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'non_confermato', ?)`,
    [
      id,
      barberId,
      customer.id,
      customer.name,
      data.date,
      data.time,
      data.durationMinutes || 45,
      data.notes || null,
    ]
  );

  return { id };
}

export async function actionCreateCustomer(
  barberId: number,
  data: { name: string; phone: string; lastCutDate?: string | null }
) {
  const db = await getDb();
  const id = uuid();
  await db.run(
    `INSERT INTO customers (id, barber_id, name, phone, last_cut_date, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      barberId,
      data.name.trim(),
      data.phone.trim(),
      data.lastCutDate || null,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
    ]
  );

  await db
    .run(`INSERT INTO monthly_stats (barber_id) VALUES (?) ON CONFLICT DO NOTHING`, [
      barberId,
    ])
    .catch(() =>
      db.run(`INSERT OR IGNORE INTO monthly_stats (barber_id) VALUES (?)`, [
        barberId,
      ])
    );

  return { id };
}

export async function importCustomersFromCsv(
  barberId: number,
  csv: string
): Promise<{ imported: number; errors: string[] }> {
  const lines = csv.trim().split("\n");
  let imported = 0;
  const errors: string[] = [];

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) continue;
    const [name, phone, lastCut] = parts;
    if (!name || !phone) {
      errors.push(`Riga invalida: ${line}`);
      continue;
    }
    try {
      await actionCreateCustomer(barberId, {
        name,
        phone,
        lastCutDate: lastCut || null,
      });
      imported++;
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : "errore"}`);
    }
  }

  return { imported, errors };
}

export async function getAllCustomers(barberId: number): Promise<Customer[]> {
  const db = await getDb();
  return db.all<Customer>(
    "SELECT * FROM customers WHERE barber_id = ? ORDER BY name ASC",
    [barberId]
  );
}

export { getPendingRequests };
