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
import { syncEmptySlotsNextDays } from "./slots";
import type { ActionResult, Customer } from "./types";

export async function actionFaiGuadagnare(
  barberId: number
): Promise<ActionResult & { recoverySent: number; remindersSent: number }> {
  const customers = getCustomersToRecover(barberId);
  const noShows = getNoShowAtRisk(barberId);
  const db = getDb();

  const recoveryResults = await broadcastRecoveryMessages(
    barberId,
    customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
  );

  const reminderResults = [];
  for (const appt of noShows) {
    const customer = db
      .prepare("SELECT * FROM customers WHERE id = ? AND barber_id = ?")
      .get(appt.customer_id, barberId) as Customer | undefined;
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
    db.prepare(
      `UPDATE monthly_stats SET recovered_customers = recovered_customers + ? WHERE barber_id = ?`
    ).run(
      recoveryResults.filter((r) => r.status !== "failed").length,
      barberId
    );
  }

  return {
    ...summary,
    results: allResults,
    recoverySent: recoveryResults.filter((r) => r.status !== "failed").length,
    remindersSent: reminderResults.filter((r) => r.status !== "failed").length,
  };
}

export async function actionSendReminders(
  barberId: number
): Promise<ActionResult> {
  const noShows = getNoShowAtRisk(barberId);
  const db = getDb();
  const results = [];

  for (const appt of noShows) {
    const customer = db
      .prepare("SELECT * FROM customers WHERE id = ? AND barber_id = ?")
      .get(appt.customer_id, barberId) as Customer | undefined;
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

export async function actionRecoverCustomer(
  barberId: number,
  customerId: string
) {
  const db = getDb();
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ? AND barber_id = ?")
    .get(customerId, barberId) as Customer | undefined;
  if (!customer) throw new Error("Cliente non trovato");

  const result = await sendRecoveryMessage(
    barberId,
    customer.id,
    customer.name,
    customer.phone
  );

  if (result.status !== "failed") {
    db.prepare(
      `UPDATE customers SET recovery_sent_at = datetime('now') WHERE id = ? AND barber_id = ?`
    ).run(customerId, barberId);
    db.prepare(
      `UPDATE monthly_stats SET recovered_customers = recovered_customers + 1 WHERE barber_id = ?`
    ).run(barberId);
  }

  return result;
}

export async function actionSendReminder(
  barberId: number,
  appointmentId: string
) {
  const db = getDb();
  const appt = db
    .prepare(
      `SELECT * FROM appointments WHERE id = ? AND barber_id = ?`
    )
    .get(appointmentId, barberId) as
    | { customer_id: string; time: string }
    | undefined;
  if (!appt) throw new Error("Appuntamento non trovato");

  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ? AND barber_id = ?")
    .get(appt.customer_id, barberId) as Customer | undefined;
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
  const db = getDb();
  const slot = db
    .prepare(
      `SELECT * FROM empty_slots WHERE id = ? AND barber_id = ?`
    )
    .get(slotId, barberId) as
    | { start_time: string; published: number }
    | undefined;
  if (!slot) throw new Error("Slot non trovato");

  const results = await broadcastSlotToActiveCustomers(
    barberId,
    slot.start_time
  );
  const summary = summarizeSendResults(results);

  if (summary.success || summary.simulated > 0) {
    db.prepare(
      `UPDATE empty_slots SET published = 1 WHERE id = ? AND barber_id = ?`
    ).run(slotId, barberId);
    db.prepare(
      `UPDATE monthly_stats SET slots_filled = slots_filled + 1 WHERE barber_id = ?`
    ).run(barberId);
  }

  return { ...summary, results };
}

export async function actionAcceptRequest(
  barberId: number,
  requestId: string
) {
  const db = getDb();
  const request = db
    .prepare(
      `SELECT * FROM appointment_requests WHERE id = ? AND barber_id = ?`
    )
    .get(requestId, barberId) as
    | {
        customer_id: string;
        customer_name: string;
        customer_phone: string;
        requested_date: string;
        requested_time: string;
      }
    | undefined;
  if (!request) throw new Error("Richiesta non trovata");

  const apptId = uuid();
  db.prepare(
    `INSERT INTO appointments (id, barber_id, customer_id, customer_name, date, time, status)
     VALUES (?, ?, ?, ?, ?, ?, 'confermato')`
  ).run(
    apptId,
    barberId,
    request.customer_id,
    request.customer_name,
    request.requested_date,
    request.requested_time
  );

  db.prepare(
    `UPDATE appointment_requests SET status = 'accettata' WHERE id = ? AND barber_id = ?`
  ).run(requestId, barberId);

  syncEmptySlotsNextDays(barberId, 7);

  const content = WHATSAPP_TEMPLATES.richiesta_accettata(
    request.customer_name,
    request.requested_date,
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

export async function actionRejectRequest(
  barberId: number,
  requestId: string
) {
  const db = getDb();
  const request = db
    .prepare(
      `SELECT * FROM appointment_requests WHERE id = ? AND barber_id = ?`
    )
    .get(requestId, barberId) as
    | {
        customer_id: string;
        customer_name: string;
        customer_phone: string;
      }
    | undefined;
  if (!request) throw new Error("Richiesta non trovata");

  db.prepare(
    `UPDATE appointment_requests SET status = 'rifiutata' WHERE id = ? AND barber_id = ?`
  ).run(requestId, barberId);

  const content = WHATSAPP_TEMPLATES.richiesta_rifiutata(
    request.customer_name
  );

  return sendWhatsAppMessage(
    barberId,
    request.customer_phone,
    request.customer_name,
    request.customer_id,
    "richiesta_rifiutata",
    content
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
  const db = getDb();
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ? AND barber_id = ?")
    .get(data.customerId, barberId) as Customer | undefined;
  if (!customer) throw new Error("Cliente non trovato");

  const id = uuid();
  db.prepare(
    `INSERT INTO appointments (id, barber_id, customer_id, customer_name, date, time, duration_minutes, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'non_confermato', ?)`
  ).run(
    id,
    barberId,
    customer.id,
    customer.name,
    data.date,
    data.time,
    data.durationMinutes || 45,
    data.notes || null
  );

  syncEmptySlotsNextDays(barberId, 7);

  return { id };
}

export async function actionCreateCustomer(
  barberId: number,
  data: { name: string; phone: string; lastCutDate?: string | null }
) {
  const db = getDb();
  const id = uuid();
  db.prepare(
    `INSERT INTO customers (id, barber_id, name, phone, last_cut_date, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    barberId,
    data.name.trim(),
    data.phone.trim(),
    data.lastCutDate || null,
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`
  );

  db.prepare(
    `INSERT OR IGNORE INTO monthly_stats (barber_id) VALUES (?)`
  ).run(barberId);

  return { id };
}

export function getAllCustomers(barberId: number): Customer[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM customers WHERE barber_id = ? ORDER BY name ASC"
    )
    .all(barberId) as Customer[];
}

export { getPendingRequests };
