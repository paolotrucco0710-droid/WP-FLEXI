import { v4 as uuid } from "uuid";
import { getDb } from "./db";
import { WHATSAPP_TEMPLATES } from "./constants";
import type { MessageType } from "./types";

export interface SendResult {
  success: boolean;
  messageId: string;
  phone: string;
  content: string;
  mode: "simulated" | "live";
}

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

function isLiveMode(): boolean {
  return !!(WHATSAPP_API_URL && WHATSAPP_API_TOKEN && WHATSAPP_PHONE_ID);
}

async function sendViaApi(phone: string, content: string): Promise<boolean> {
  if (!isLiveMode()) return false;

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
  phone: string,
  customerName: string,
  customerId: string | null,
  messageType: MessageType,
  content: string
): Promise<SendResult> {
  const db = getDb();
  const messageId = uuid();
  const live = isLiveMode();
  let status: "sent" | "simulated" | "failed" = "simulated";

  if (live) {
    const ok = await sendViaApi(phone, content);
    status = ok ? "sent" : "failed";
  }

  db.prepare(
    `INSERT INTO whatsapp_messages (id, customer_id, customer_name, phone, message_type, content, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(messageId, customerId, customerName, phone, messageType, content, status);

  return {
    success: status !== "failed",
    messageId,
    phone,
    content,
    mode: live ? "live" : "simulated",
  };
}

export async function sendRecoveryMessage(
  customerId: string,
  name: string,
  phone: string
): Promise<SendResult> {
  const content = WHATSAPP_TEMPLATES.recupero(name);
  return sendWhatsAppMessage(phone, name, customerId, "recupero", content);
}

export async function sendReminderMessage(
  customerId: string,
  name: string,
  phone: string,
  time: string
): Promise<SendResult> {
  const content = WHATSAPP_TEMPLATES.promemoria(time);
  return sendWhatsAppMessage(phone, name, customerId, "promemoria", content);
}

export async function sendSlotMessage(
  phone: string,
  customerName: string,
  customerId: string | null,
  startTime: string
): Promise<SendResult> {
  const content = WHATSAPP_TEMPLATES.slot_vuoto(startTime);
  return sendWhatsAppMessage(
    phone,
    customerName,
    customerId,
    "slot_vuoto",
    content
  );
}

export async function broadcastRecoveryMessages(
  customers: { id: string; name: string; phone: string }[]
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  for (const c of customers) {
    results.push(await sendRecoveryMessage(c.id, c.name, c.phone));
  }
  return results;
}

export async function broadcastSlotToActiveCustomers(
  startTime: string
): Promise<SendResult[]> {
  const db = getDb();
  const customers = db
    .prepare(
      `SELECT id, name, phone FROM customers 
       WHERE last_cut_date IS NOT NULL 
       AND julianday('now') - julianday(last_cut_date) < 60
       ORDER BY last_cut_date DESC LIMIT 20`
    )
    .all() as { id: string; name: string; phone: string }[];

  const results: SendResult[] = [];
  for (const c of customers) {
    results.push(await sendSlotMessage(c.phone, c.name, c.id, startTime));
  }
  return results;
}
