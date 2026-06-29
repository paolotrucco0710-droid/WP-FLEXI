import { v4 as uuid } from "uuid";
import { getDb } from "./db";
import {
  broadcastRecoveryMessages,
  broadcastSlotToActiveCustomers,
  sendRecoveryMessage,
  sendReminderMessage,
  sendWhatsAppMessage,
} from "./whatsapp";
import { WHATSAPP_TEMPLATES } from "./constants";
import {
  getCustomersToRecover,
  getNoShowAtRisk,
  getPendingRequests,
} from "./rules";
import type { Customer } from "./types";

export async function actionFaiGuadagnare() {
  const customers = getCustomersToRecover();
  const noShows = getNoShowAtRisk();
  const db = getDb();

  const recoveryResults = await broadcastRecoveryMessages(
    customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
  );

  const reminderResults = [];
  for (const appt of noShows) {
    const customer = db
      .prepare("SELECT * FROM customers WHERE id = ?")
      .get(appt.customer_id) as Customer | undefined;
    if (customer) {
      reminderResults.push(
        await sendReminderMessage(
          customer.id,
          customer.name,
          customer.phone,
          appt.time
        )
      );
    }
  }

  return {
    recoverySent: recoveryResults.length,
    remindersSent: reminderResults.length,
    results: [...recoveryResults, ...reminderResults],
  };
}

export async function actionSendReminders() {
  const noShows = getNoShowAtRisk();
  const db = getDb();
  const results = [];

  for (const appt of noShows) {
    const customer = db
      .prepare("SELECT * FROM customers WHERE id = ?")
      .get(appt.customer_id) as Customer | undefined;
    if (customer) {
      results.push(
        await sendReminderMessage(
          customer.id,
          customer.name,
          customer.phone,
          appt.time
        )
      );
    }
  }

  return { sent: results.length, results };
}

export async function actionRecoverCustomer(customerId: string) {
  const db = getDb();
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(customerId) as Customer | undefined;
  if (!customer) throw new Error("Cliente non trovato");
  return sendRecoveryMessage(customer.id, customer.name, customer.phone);
}

export async function actionSendReminder(appointmentId: string) {
  const db = getDb();
  const appt = db
    .prepare("SELECT * FROM appointments WHERE id = ?")
    .get(appointmentId) as
    | { customer_id: string; time: string }
    | undefined;
  if (!appt) throw new Error("Appuntamento non trovato");

  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(appt.customer_id) as Customer | undefined;
  if (!customer) throw new Error("Cliente non trovato");

  return sendReminderMessage(
    customer.id,
    customer.name,
    customer.phone,
    appt.time
  );
}

export async function actionPublishSlot(slotId: string) {
  const db = getDb();
  const slot = db
    .prepare("SELECT * FROM empty_slots WHERE id = ?")
    .get(slotId) as
    | { start_time: string; published: number }
    | undefined;
  if (!slot) throw new Error("Slot non trovato");

  const results = await broadcastSlotToActiveCustomers(slot.start_time);

  db.prepare("UPDATE empty_slots SET published = 1 WHERE id = ?").run(slotId);
  db.prepare(
    "UPDATE monthly_stats SET slots_filled = slots_filled + 1 WHERE id = 1"
  ).run();

  return { sent: results.length, results };
}

export async function actionAcceptRequest(requestId: string) {
  const db = getDb();
  const request = db
    .prepare("SELECT * FROM appointment_requests WHERE id = ?")
    .get(requestId) as
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
    `INSERT INTO appointments (id, customer_id, customer_name, date, time, status)
     VALUES (?, ?, ?, ?, ?, 'confermato')`
  ).run(
    apptId,
    request.customer_id,
    request.customer_name,
    request.requested_date,
    request.requested_time
  );

  db.prepare(
    "UPDATE appointment_requests SET status = 'accettata' WHERE id = ?"
  ).run(requestId);

  const content = WHATSAPP_TEMPLATES.richiesta_accettata(
    request.customer_name,
    request.requested_date,
    request.requested_time
  );

  return sendWhatsAppMessage(
    request.customer_phone,
    request.customer_name,
    request.customer_id,
    "richiesta_accettata",
    content
  );
}

export async function actionRejectRequest(requestId: string) {
  const db = getDb();
  const request = db
    .prepare("SELECT * FROM appointment_requests WHERE id = ?")
    .get(requestId) as
    | {
        customer_id: string;
        customer_name: string;
        customer_phone: string;
      }
    | undefined;
  if (!request) throw new Error("Richiesta non trovata");

  db.prepare(
    "UPDATE appointment_requests SET status = 'rifiutata' WHERE id = ?"
  ).run(requestId);

  const content = WHATSAPP_TEMPLATES.richiesta_rifiutata(
    request.customer_name
  );

  return sendWhatsAppMessage(
    request.customer_phone,
    request.customer_name,
    request.customer_id,
    "richiesta_rifiutata",
    content
  );
}

export async function actionCreateAppointment(data: {
  customerId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  notes?: string;
}) {
  const db = getDb();
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(data.customerId) as Customer | undefined;
  if (!customer) throw new Error("Cliente non trovato");

  const id = uuid();
  db.prepare(
    `INSERT INTO appointments (id, customer_id, customer_name, date, time, duration_minutes, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, 'non_confermato', ?)`
  ).run(
    id,
    customer.id,
    customer.name,
    data.date,
    data.time,
    data.durationMinutes || 45,
    data.notes || null
  );

  return { id };
}

export function getAllCustomers(): Customer[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM customers ORDER BY name ASC")
    .all() as Customer[];
}

export { getPendingRequests };
