import { differenceInDays, parseISO } from "date-fns";
import { getDb } from "./db";
import { getToday } from "./format";
import {
  EARNINGS,
  RECOVERY_DAYS_THRESHOLD,
  WHATSAPP_TEMPLATES,
} from "./constants";
import type {
  Appointment,
  AppointmentRequest,
  Customer,
  CustomerToRecover,
  DashboardStats,
  EmptySlot,
  WhatsAppMessage,
} from "./types";

export function getCustomersToRecover(): CustomerToRecover[] {
  const db = getDb();
  const customers = db
    .prepare("SELECT * FROM customers ORDER BY last_cut_date ASC")
    .all() as Customer[];

  const today = new Date();
  return customers
    .filter((c) => {
      if (!c.last_cut_date) return true;
      return differenceInDays(today, parseISO(c.last_cut_date)) >= RECOVERY_DAYS_THRESHOLD;
    })
    .map((c) => ({
      ...c,
      days_since_last_cut: c.last_cut_date
        ? differenceInDays(today, parseISO(c.last_cut_date))
        : 999,
    }));
}

export function getNoShowAtRisk(): Appointment[] {
  const db = getDb();
  const today = getToday();
  return db
    .prepare(
      `SELECT * FROM appointments 
       WHERE date = ? AND status IN ('non_confermato', 'rischio_no_show')
       ORDER BY time ASC`
    )
    .all(today) as Appointment[];
}

export function getTodayAppointments(): {
  confirmed: Appointment[];
  unconfirmed: Appointment[];
} {
  const db = getDb();
  const today = getToday();
  const all = db
    .prepare("SELECT * FROM appointments WHERE date = ? ORDER BY time ASC")
    .all(today) as Appointment[];

  return {
    confirmed: all.filter((a) => a.status === "confermato"),
    unconfirmed: all.filter(
      (a) => a.status === "non_confermato" || a.status === "rischio_no_show"
    ),
  };
}

export function getEmptySlots(): EmptySlot[] {
  const db = getDb();
  const today = getToday();
  return db
    .prepare(
      "SELECT * FROM empty_slots WHERE date >= ? AND published = 0 ORDER BY date, start_time"
    )
    .all(today) as EmptySlot[];
}

export function getPendingRequests(): AppointmentRequest[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM appointment_requests WHERE status = 'da_gestire' ORDER BY requested_date, requested_time"
    )
    .all() as AppointmentRequest[];
}

export function getManagedRequests(): AppointmentRequest[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM appointment_requests WHERE status != 'da_gestire' ORDER BY created_at DESC LIMIT 20"
    )
    .all() as AppointmentRequest[];
}

export function getDashboardStats(): DashboardStats {
  const toRecover = getCustomersToRecover();
  const noShow = getNoShowAtRisk();
  const slots = getEmptySlots();
  const { confirmed, unconfirmed } = getTodayAppointments();
  const requests = getPendingRequests();

  const db = getDb();
  const monthly = db
    .prepare("SELECT * FROM monthly_stats WHERE id = 1")
    .get() as {
    recovered_customers: number;
    no_shows_avoided: number;
    slots_filled: number;
  };

  const totalEarned =
    monthly.recovered_customers * EARNINGS.recovery +
    monthly.no_shows_avoided * EARNINGS.noShowAvoided +
    monthly.slots_filled * EARNINGS.slotFilled;

  return {
    customersToRecover: toRecover.length,
    noShowAtRisk: noShow.length,
    emptySlots: slots.length,
    confirmedToday: confirmed.length,
    unconfirmedToday: unconfirmed.length,
    pendingRequests: requests.length,
    recoveredThisMonth: monthly.recovered_customers,
    noShowsAvoidedThisMonth: monthly.no_shows_avoided,
    slotsFilledThisMonth: monthly.slots_filled,
    totalEarnedThisMonth: totalEarned,
  };
}

export function getCustomerById(id: string): Customer | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as Customer) ||
    null
  );
}

export function getCustomerAppointments(customerId: string): Appointment[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM appointments WHERE customer_id = ? ORDER BY date DESC, time DESC"
    )
    .all(customerId) as Appointment[];
}

export function getCalendarDay(date: string): {
  appointments: Appointment[];
  emptySlots: EmptySlot[];
} {
  const db = getDb();
  const appointments = db
    .prepare("SELECT * FROM appointments WHERE date = ? ORDER BY time ASC")
    .all(date) as Appointment[];
  const emptySlots = db
    .prepare("SELECT * FROM empty_slots WHERE date = ? ORDER BY start_time ASC")
    .all(date) as EmptySlot[];
  return { appointments, emptySlots };
}

export function getRecentMessages(limit = 50): WhatsAppMessage[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT ?")
    .all(limit) as WhatsAppMessage[];
}

export { WHATSAPP_TEMPLATES };
export { formatDateItalian, formatRequestDate, getToday } from "./format";
