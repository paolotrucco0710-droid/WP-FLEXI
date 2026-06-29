import { v4 as uuid } from "uuid";
import { getDb } from "./db";
import { normalizePhone } from "./phone";
import { computeSlotsForDates } from "./slots";
import { logger } from "./logger";

export interface WebhookMessage {
  from: string;
  body: string;
  barberId?: number;
  messageId?: string;
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

export async function handleInboundWhatsApp(
  message: WebhookMessage
): Promise<WebhookResult> {
  const db = await getDb();
  const phone = normalizePhone(message.from);
  const response = parseYesNo(message.body);

  if (!response) {
    return { ok: false, error: "Messaggio non riconosciuto (usa SI o NO)" };
  }

  const idempotencyKey =
    message.messageId ?? `inbound-${phone}-${message.body}-${Date.now()}`;

  const existing = await db.get<{ id: string }>(
    `SELECT id FROM inbound_messages WHERE idempotency_key = ?`,
    [idempotencyKey]
  );
  if (existing) {
    return { ok: true, action: "duplicate_ignored" };
  }

  let barberId = message.barberId;
  let customer: { id: string; barber_id: number; name: string } | undefined;

  if (barberId) {
    customer = await db.get(
      `SELECT id, barber_id, name FROM customers 
       WHERE barber_id = ? AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', '') LIKE ?
       LIMIT 1`,
      [barberId, `%${phone.slice(-10)}`]
    );
  } else {
    customer = await db.get(
      `SELECT id, barber_id, name FROM customers 
       WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', '') LIKE ?
       LIMIT 1`,
      [`%${phone.slice(-10)}`]
    );
    barberId = customer?.barber_id;
  }

  if (!customer || !barberId) {
    return { ok: false, error: "Cliente non trovato per questo numero" };
  }

  const inboundId = uuid();
  await db.run(
    `INSERT INTO inbound_messages (id, barber_id, customer_id, phone, body, action_taken, idempotency_key)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      inboundId,
      barberId,
      customer.id,
      message.from,
      message.body,
      response,
      idempotencyKey,
    ]
  );

  const dialect = db.dialect;
  const dateCmp =
    dialect === "postgres" ? `date >= CURRENT_DATE` : `date >= date('now')`;

  const pendingAppt = await db.get<{ id: string; date: string; time: string }>(
    `SELECT id, date, time FROM appointments 
     WHERE barber_id = ? AND customer_id = ? 
     AND status IN ('non_confermato', 'rischio_no_show')
     AND ${dateCmp}
     ORDER BY date ASC, time ASC LIMIT 1`,
    [barberId, customer.id]
  );

  if (response === "SI") {
    if (pendingAppt) {
      await db.run(
        `UPDATE appointments SET status = 'confermato' WHERE id = ? AND barber_id = ?`,
        [pendingAppt.id, barberId]
      );
      await db.run(
        `UPDATE monthly_stats SET no_shows_avoided = no_shows_avoided + 1 WHERE barber_id = ?`,
        [barberId]
      );
      logger.info("webhook_confirmed", { barberId, appointmentId: pendingAppt.id });
      return {
        ok: true,
        action: "appointment_confirmed",
        customerId: customer.id,
        appointmentId: pendingAppt.id,
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const slots = await computeSlotsForDates(barberId, [today]);
    const slot = slots[0];

    if (slot) {
      const apptId = uuid();
      await db.run(
        `INSERT INTO appointments (id, barber_id, customer_id, customer_name, date, time, duration_minutes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'confermato')`,
        [
          apptId,
          barberId,
          customer.id,
          customer.name,
          slot.date,
          slot.start_time,
          slot.duration_minutes,
        ]
      );
      await db.run(
        `INSERT INTO published_slots (barber_id, slot_date, start_time) VALUES (?, ?, ?)
         ON CONFLICT DO NOTHING`,
        [barberId, slot.date, slot.start_time]
      ).catch(() =>
        db.run(
          `INSERT OR IGNORE INTO published_slots (barber_id, slot_date, start_time) VALUES (?, ?, ?)`,
          [barberId, slot.date, slot.start_time]
        )
      );

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
    await db.run(
      `UPDATE appointments SET status = 'cancellato' WHERE id = ? AND barber_id = ?`,
      [pendingAppt.id, barberId]
    );
    return {
      ok: true,
      action: "appointment_rejected",
      customerId: customer.id,
      appointmentId: pendingAppt.id,
    };
  }

  return { ok: true, action: "no_pending_appointment", customerId: customer.id };
}

export function parseMetaWebhookPayload(body: unknown): WebhookMessage | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (b.from && b.body) {
    return {
      from: String(b.from),
      body: String(b.body),
      barberId: b.barberId ? Number(b.barberId) : undefined,
      messageId: b.messageId ? String(b.messageId) : undefined,
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
      messageId: msg.id ? String(msg.id) : undefined,
    };
  }

  return null;
}
