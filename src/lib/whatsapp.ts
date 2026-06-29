import { v4 as uuid } from "uuid";
import { getDb } from "./db";
import { WHATSAPP_TEMPLATES } from "./constants";
import type { MessageType, SendMessageResult } from "./types";

export function isWhatsAppLive(): boolean {
  return !!(
    process.env.WHATSAPP_API_URL &&
    process.env.WHATSAPP_API_TOKEN &&
    process.env.WHATSAPP_PHONE_ID
  );
}

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

async function sendViaApi(phone: string, content: string): Promise<boolean> {
  if (!isWhatsAppLive()) return false;

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
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
    return response.ok;
  } catch {
    return false;
  }
}

export async function sendWhatsAppMessage(
  barberId: number,
  phone: string,
  customerName: string,
  customerId: string | null,
  messageType: MessageType,
  content: string
): Promise<SendMessageResult> {
  const db = getDb();
  const messageId = uuid();
  const live = isWhatsAppLive();
  let status: "sent" | "simulated" | "failed" = "simulated";

  if (live) {
    const ok = await sendViaApi(phone, content);
    status = ok ? "sent" : "failed";
  }

  db.prepare(
    `INSERT INTO whatsapp_messages (id, barber_id, customer_id, customer_name, phone, message_type, content, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    messageId,
    barberId,
    customerId,
    customerName,
    phone,
    messageType,
    content,
    status
  );

  return {
    success: status !== "failed",
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
): Promise<SendMessageResult> {
  const content = WHATSAPP_TEMPLATES.recupero(name);
  return sendWhatsAppMessage(
    barberId,
    phone,
    name,
    customerId,
    "recupero",
    content
  );
}

export async function sendReminderMessage(
  barberId: number,
  customerId: string,
  name: string,
  phone: string,
  time: string,
  dateLabel?: string
): Promise<SendMessageResult> {
  const content = dateLabel
    ? WHATSAPP_TEMPLATES.promemoria_domani(time, dateLabel)
    : WHATSAPP_TEMPLATES.promemoria(time);
  return sendWhatsAppMessage(
    barberId,
    phone,
    name,
    customerId,
    "promemoria",
    content
  );
}

export async function sendSlotMessage(
  barberId: number,
  phone: string,
  customerName: string,
  customerId: string | null,
  startTime: string
): Promise<SendMessageResult> {
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
): Promise<SendMessageResult[]> {
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
): Promise<SendMessageResult[]> {
  const db = getDb();
  const customers = db
    .prepare(
      `SELECT id, name, phone FROM customers 
       WHERE barber_id = ? AND last_cut_date IS NOT NULL 
       AND julianday('now') - julianday(last_cut_date) < 60
       ORDER BY last_cut_date DESC LIMIT 20`
    )
    .all(barberId) as { id: string; name: string; phone: string }[];

  const results: SendMessageResult[] = [];
  for (const c of customers) {
    results.push(
      await sendSlotMessage(barberId, c.phone, c.name, c.id, startTime)
    );
  }
  return results;
}

export function summarizeSendResults(
  results: SendMessageResult[]
): { success: boolean; sent: number; simulated: number; failed: number } {
  const failed = results.filter((r) => r.status === "failed").length;
  const sent = results.filter((r) => r.status === "sent").length;
  const simulated = results.filter((r) => r.status === "simulated").length;
  return {
    success: failed === 0,
    sent,
    simulated,
    failed,
  };
}
