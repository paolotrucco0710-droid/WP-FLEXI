import { v4 as uuid } from "uuid";
import { getDb } from "./db";
import { normalizePhone } from "./phone";

export interface WebhookMessage {
  from: string;
  body: string;
  barberId?: number;
}

export interface WebhookResult {
  ok: boolean;
  action?: string;
  customerId?: string;
  appointmentId?: string;
  error?: string;
}

function parseYesNo(body: string): "SI" | "NO" | null {
  const normalized = body.trim().toUpperCase();
  if (/^(SI|SÌ|YES|OK|CONFERMO)$/.test(normalized)) return "SI";
  if (/^(NO|N)$/.test(normalized)) return "NO";
  return null;
}

export function handleInboundWhatsApp(
  message: WebhookMessage
): WebhookResult {
  const db = getDb();
  const phone = normalizePhone(message.from);
  const response = parseYesNo(message.body);

  if (!response) {
    return { ok: false, error: "Messaggio non riconosciuto (usa SI o NO)" };
  }

  let barberId = message.barberId;
  let customer: {
    id: string;
    barber_id: number;
    name: string;
  } | undefined;

  if (barberId) {
    customer = db
      .prepare(
        `SELECT id, barber_id, name FROM customers 
         WHERE barber_id = ? AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', '') LIKE ?
         LIMIT 1`
      )
      .get(barberId, `%${phone.slice(-10)}`) as typeof customer;
  } else {
    customer = db
      .prepare(
        `SELECT id, barber_id, name FROM customers 
         WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', '') LIKE ?
         LIMIT 1`
      )
      .get(`%${phone.slice(-10)}`) as typeof customer;
    barberId = customer?.barber_id;
  }

  if (!customer || !barberId) {
    return { ok: false, error: "Cliente non trovato per questo numero" };
  }

  const inboundId = uuid();
  db.prepare(
    `INSERT INTO inbound_messages (id, barber_id, customer_id, phone, body, action_taken)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    inboundId,
    barberId,
    customer.id,
    message.from,
    message.body,
    response
  );

  const pendingAppt = db
    .prepare(
      `SELECT * FROM appointments 
       WHERE barber_id = ? AND customer_id = ? 
       AND status IN ('non_confermato', 'rischio_no_show')
       AND date >= date('now')
       ORDER BY date ASC, time ASC
       LIMIT 1`
    )
    .get(barberId, customer.id) as
    | { id: string; date: string; time: string }
    | undefined;

  if (response === "SI") {
    if (pendingAppt) {
      db.prepare(
        `UPDATE appointments SET status = 'confermato' WHERE id = ? AND barber_id = ?`
      ).run(pendingAppt.id, barberId);

      db.prepare(
        `UPDATE monthly_stats SET no_shows_avoided = no_shows_avoided + 1 WHERE barber_id = ?`
      ).run(barberId);

      return {
        ok: true,
        action: "appointment_confirmed",
        customerId: customer.id,
        appointmentId: pendingAppt.id,
      };
    }

    const slot = db
      .prepare(
        `SELECT * FROM empty_slots 
         WHERE barber_id = ? AND published = 0 AND date >= date('now')
         ORDER BY date, start_time LIMIT 1`
      )
      .get(barberId) as
      | { id: string; date: string; start_time: string; duration_minutes: number }
      | undefined;

    if (slot) {
      const apptId = uuid();
      db.prepare(
        `INSERT INTO appointments (id, barber_id, customer_id, customer_name, date, time, duration_minutes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'confermato')`
      ).run(
        apptId,
        barberId,
        customer.id,
        customer.name,
        slot.date,
        slot.start_time,
        slot.duration_minutes
      );
      db.prepare(
        `UPDATE empty_slots SET published = 1 WHERE id = ?`
      ).run(slot.id);

      return {
        ok: true,
        action: "appointment_created_from_slot",
        customerId: customer.id,
        appointmentId: apptId,
      };
    }

    return { ok: false, error: "Nessun appuntamento o slot da confermare" };
  }

  if (pendingAppt) {
    db.prepare(
      `UPDATE appointments SET status = 'cancellato' WHERE id = ? AND barber_id = ?`
    ).run(pendingAppt.id, barberId);
    return {
      ok: true,
      action: "appointment_rejected",
      customerId: customer.id,
      appointmentId: pendingAppt.id,
    };
  }

  return { ok: true, action: "no_pending_appointment", customerId: customer.id };
}

export function parseMetaWebhookPayload(
  body: unknown
): WebhookMessage | null {
  if (!body || typeof body !== "object") return null;

  const b = body as Record<string, unknown>;

  if (b.from && b.body) {
    return {
      from: String(b.from),
      body: String(b.body),
      barberId: b.barberId ? Number(b.barberId) : undefined,
    };
  }

  const entry = (b.entry as unknown[])?.[0] as Record<string, unknown>;
  const changes = (entry?.changes as unknown[])?.[0] as Record<string, unknown>;
  const value = changes?.value as Record<string, unknown>;
  const messages = value?.messages as unknown[];
  const msg = messages?.[0] as Record<string, unknown>;

  if (msg?.from && msg?.text) {
    const text = msg.text as Record<string, unknown>;
    return {
      from: String(msg.from),
      body: String(text.body ?? ""),
    };
  }

  return null;
}
