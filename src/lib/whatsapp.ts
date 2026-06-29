import { v4 as uuid } from "uuid";
import { getDb } from "./db";
import { WHATSAPP_TEMPLATES } from "./constants";
import { logger } from "./logger";
import type { MessageType, SendMessageResult } from "./types";

const MAX_RETRIES = 3;

export interface WhatsAppConfig {
  apiUrl?: string;
  apiToken?: string;
  phoneId?: string;
  verified?: boolean;
}

export async function getBarberWhatsAppConfig(
  barberId: number
): Promise<WhatsAppConfig> {
  const db = await getDb();
  const barber = await db.get<{
    whatsapp_phone_id: string | null;
    whatsapp_api_token: string | null;
    whatsapp_verified: boolean | number;
  }>(
    `SELECT whatsapp_phone_id, whatsapp_api_token, whatsapp_verified FROM barbers WHERE id = ?`,
    [barberId]
  );

  const envLive = !!(
    process.env.WHATSAPP_API_URL &&
    process.env.WHATSAPP_API_TOKEN &&
    process.env.WHATSAPP_PHONE_ID
  );

  if (barber?.whatsapp_phone_id && barber?.whatsapp_api_token) {
    return {
      apiUrl: process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v18.0",
      apiToken: barber.whatsapp_api_token,
      phoneId: barber.whatsapp_phone_id,
      verified: !!barber.whatsapp_verified,
    };
  }

  if (envLive) {
    return {
      apiUrl: process.env.WHATSAPP_API_URL,
      apiToken: process.env.WHATSAPP_API_TOKEN,
      phoneId: process.env.WHATSAPP_PHONE_ID,
      verified: true,
    };
  }

  return {};
}

export function isWhatsAppLive(config: WhatsAppConfig): boolean {
  return !!(config.apiUrl && config.apiToken && config.phoneId && config.verified);
}

export function canSendWhatsApp(config: WhatsAppConfig): {
  allowed: boolean;
  reason?: string;
} {
  if (process.env.NODE_ENV !== "production") {
    if (!config.apiToken) return { allowed: true };
  }
  if (!config.apiToken || !config.phoneId) {
    return { allowed: false, reason: "WHATSAPP_NOT_CONFIGURED" };
  }
  if (!config.verified) {
    return { allowed: false, reason: "WHATSAPP_NOT_VERIFIED" };
  }
  return { allowed: true };
}

async function sendViaApi(
  config: WhatsAppConfig,
  phone: string,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${config.apiUrl}/${config.phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/\D/g, ""),
          type: "text",
          text: { body: content },
        }),
      }
    );
    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function sendWhatsAppMessage(
  barberId: number,
  phone: string,
  customerName: string,
  customerId: string | null,
  messageType: MessageType,
  content: string,
  idempotencyKey?: string
): Promise<SendMessageResult> {
  const db = await getDb();
  const messageId = uuid();
  const config = await getBarberWhatsAppConfig(barberId);
  const gate = canSendWhatsApp(config);
  const live = isWhatsAppLive(config);

  if (idempotencyKey) {
    const existing = await db.get<{ id: string; status: string }>(
      `SELECT id, status FROM whatsapp_messages WHERE idempotency_key = ? AND barber_id = ?`,
      [idempotencyKey, barberId]
    );
    if (existing) {
      return {
        success: existing.status !== "failed",
        messageId: existing.id,
        phone,
        content,
        status: existing.status as SendMessageResult["status"],
        mode: live ? "live" : "simulated",
      };
    }
  }

  let status: SendMessageResult["status"] = "simulated";
  let retryCount = 0;
  let errorMessage: string | null = null;

  if (live && gate.allowed) {
    status = "queued";
    await db.run(
      `INSERT INTO whatsapp_messages (id, barber_id, customer_id, customer_name, phone, message_type, content, status, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        barberId,
        customerId,
        customerName,
        phone,
        messageType,
        content,
        status,
        idempotencyKey ?? null,
      ]
    );

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      retryCount = attempt;
      const result = await sendViaApi(config, phone, content);
      if (result.ok) {
        status = "sent";
        break;
      }
      errorMessage = result.error ?? "Unknown error";
      status = "failed";
      logger.warn("whatsapp_send_failed", {
        barberId,
        attempt,
        error: errorMessage,
      });
    }

    await db.run(
      `UPDATE whatsapp_messages SET status = ?, retry_count = ?, error_message = ? WHERE id = ?`,
      [status, retryCount, errorMessage, messageId]
    );
  } else if (!gate.allowed && process.env.NODE_ENV === "production") {
    status = "failed";
    errorMessage = gate.reason ?? "BLOCKED";
    await db.run(
      `INSERT INTO whatsapp_messages (id, barber_id, customer_id, customer_name, phone, message_type, content, status, error_message, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        barberId,
        customerId,
        customerName,
        phone,
        messageType,
        content,
        status,
        errorMessage,
        idempotencyKey ?? null,
      ]
    );
  } else {
    await db.run(
      `INSERT INTO whatsapp_messages (id, barber_id, customer_id, customer_name, phone, message_type, content, status, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        barberId,
        customerId,
        customerName,
        phone,
        messageType,
        content,
        status,
        idempotencyKey ?? null,
      ]
    );
  }

  return {
    success: status === "sent" || status === "simulated",
    messageId,
    phone,
    content,
    status,
    mode: live ? "live" : "simulated",
  };
}

export async function sendRecoveryMessage(
  barberId: number,
  customerId: string,
  name: string,
  phone: string
) {
  const content = WHATSAPP_TEMPLATES.recupero(name);
  return sendWhatsAppMessage(
    barberId,
    phone,
    name,
    customerId,
    "recupero",
    content,
    `recovery-${barberId}-${customerId}`
  );
}

export async function sendReminderMessage(
  barberId: number,
  customerId: string,
  name: string,
  phone: string,
  time: string,
  dateLabel?: string
) {
  const content = dateLabel
    ? WHATSAPP_TEMPLATES.promemoria_domani(time, dateLabel)
    : WHATSAPP_TEMPLATES.promemoria(time);
  return sendWhatsAppMessage(
    barberId,
    phone,
    name,
    customerId,
    "promemoria",
    content,
    `reminder-${barberId}-${customerId}-${dateLabel ?? "today"}-${time}`
  );
}

export async function sendSlotMessage(
  barberId: number,
  phone: string,
  customerName: string,
  customerId: string | null,
  startTime: string
) {
  const content = WHATSAPP_TEMPLATES.slot_vuoto(startTime);
  return sendWhatsAppMessage(
    barberId,
    phone,
    customerName,
    customerId,
    "slot_vuoto",
    content
  );
}

export async function broadcastRecoveryMessages(
  barberId: number,
  customers: { id: string; name: string; phone: string }[]
) {
  const results: SendMessageResult[] = [];
  for (const c of customers) {
    results.push(
      await sendRecoveryMessage(barberId, c.id, c.name, c.phone)
    );
  }
  return results;
}

export async function broadcastSlotToActiveCustomers(
  barberId: number,
  startTime: string
) {
  const db = await getDb();
  const dialect = db.dialect;
  const dateDiffSql =
    dialect === "postgres"
      ? `CURRENT_DATE - last_cut_date::date < 60`
      : `julianday('now') - julianday(last_cut_date) < 60`;

  const customers = await db.all<{ id: string; name: string; phone: string }>(
    `SELECT id, name, phone FROM customers 
     WHERE barber_id = ? AND last_cut_date IS NOT NULL AND ${dateDiffSql}
     ORDER BY last_cut_date DESC LIMIT 20`,
    [barberId]
  );

  const results: SendMessageResult[] = [];
  for (const c of customers) {
    results.push(
      await sendSlotMessage(barberId, c.phone, c.name, c.id, startTime)
    );
  }
  return results;
}

export function summarizeSendResults(results: SendMessageResult[]) {
  const failed = results.filter((r) => r.status === "failed").length;
  const sent = results.filter((r) => r.status === "sent").length;
  const simulated = results.filter((r) => r.status === "simulated").length;
  return { success: failed === 0, sent, simulated, failed, results };
}

export async function testWhatsAppConnection(barberId: number) {
  const config = await getBarberWhatsAppConfig(barberId);
  if (!config.apiToken || !config.phoneId) {
    return { ok: false, error: "Credenziali WhatsApp mancanti" };
  }
  try {
    const response = await fetch(
      `${config.apiUrl}/${config.phoneId}`,
      { headers: { Authorization: `Bearer ${config.apiToken}` } }
    );
    if (response.ok) {
      const db = await getDb();
      await db.run(
        `UPDATE barbers SET whatsapp_verified = ?, whatsapp_enabled = ? WHERE id = ?`,
        [1, 1, barberId]
      );
      return { ok: true };
    }
    return { ok: false, error: await response.text() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Errore connessione",
    };
  }
}
