import { differenceInDays, parseISO, format, addDays } from "date-fns";
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

export function getCustomersToRecover(barberId: number): CustomerToRecover[] {
  const db = getDb();
  const customers = db
    .prepare(
      "SELECT * FROM customers WHERE barber_id = ? ORDER BY last_cut_date ASC"
    )
    .all(barberId) as Customer[];

  const today = new Date();
  return customers
    .filter((c) => {
      if (!c.last_cut_date) return true;
      return (
        differenceInDays(today, parseISO(c.last_cut_date)) >=
        RECOVERY_DAYS_THRESHOLD
      );
    })
    .map((c) => ({
      ...c,
      days_since_last_cut: c.last_cut_date
        ? differenceInDays(today, parseISO(c.last_cut_date))
        : 999,
    }));
}

export function getNoShowAtRisk(barberId: number): Appointment[] {
  const db = getDb();
  const today = getToday();
  return db
    .prepare(
      `SELECT * FROM appointments 
       WHERE barber_id = ? AND date = ? AND status IN ('non_confermato', 'rischio_no_show')
       ORDER BY time ASC`
    )
    .all(barberId, today) as Appointment[];
}

export function getTomorrowAppointmentsForReminder(
  barberId: number
): Appointment[] {
  const db = getDb();
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  return db
    .prepare(
      `SELECT * FROM appointments 
       WHERE barber_id = ? AND date = ? 
       AND status IN ('non_confermato', 'rischio_no_show')
       ORDER BY time ASC`
    )
    .all(barberId, tomorrow) as Appointment[];
}

export function getTodayAppointments(barberId: number): {
  confirmed: Appointment[];
  unconfirmed: Appointment[];
} {
  const db = getDb();
  const today = getToday();
  const all = db
    .prepare(
      "SELECT * FROM appointments WHERE barber_id = ? AND date = ? ORDER BY time ASC"
    )
    .all(barberId, today) as Appointment[];

  return {
    confirmed: all.filter((a) => a.status === "confermato"),
    unconfirmed: all.filter(
      (a) => a.status === "non_confermato" || a.status === "rischio_no_show"
    ),
  };
}

export function getEmptySlots(barberId: number): EmptySlot[] {
  const db = getDb();
  const today = getToday();
  return db
    .prepare(
      `SELECT * FROM empty_slots 
       WHERE barber_id = ? AND date >= ? AND published = 0 
       ORDER BY date, start_time`
    )
    .all(barberId, today) as EmptySlot[];
}

export function getPendingRequests(barberId: number): AppointmentRequest[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM appointment_requests 
       WHERE barber_id = ? AND status = 'da_gestire' 
       ORDER BY requested_date, requested_time`
    )
    .all(barberId) as AppointmentRequest[];
}

export function getManagedRequests(barberId: number): AppointmentRequest[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM appointment_requests 
       WHERE barber_id = ? AND status != 'da_gestire' 
       ORDER BY created_at DESC LIMIT 20`
    )
    .all(barberId) as AppointmentRequest[];
}

export function getDashboardStats(barberId: number): DashboardStats {
  const toRecover = getCustomersToRecover(barberId);
  const noShow = getNoShowAtRisk(barberId);
  const slots = getEmptySlots(barberId);
  const { confirmed, unconfirmed } = getTodayAppointments(barberId);
  const requests = getPendingRequests(barberId);

  const db = getDb();
  const monthly = db
    .prepare("SELECT * FROM monthly_stats WHERE barber_id = ?")
    .get(barberId) as
    | {
        recovered_customers: number;
        no_shows_avoided: number;
        slots_filled: number;
      }
    | undefined;

  const stats = monthly ?? {
    recovered_customers: 0,
    no_shows_avoided: 0,
    slots_filled: 0,
  };

  const totalEarned =
    stats.recovered_customers * EARNINGS.recovery +
    stats.no_shows_avoided * EARNINGS.noShowAvoided +
    stats.slots_filled * EARNINGS.slotFilled;

  return {
    customersToRecover: toRecover.length,
    noShowAtRisk: noShow.length,
    emptySlots: slots.length,
    confirmedToday: confirmed.length,
    unconfirmedToday: unconfirmed.length,
    pendingRequests: requests.length,
    recoveredThisMonth: stats.recovered_customers,
    noShowsAvoidedThisMonth: stats.no_shows_avoided,
    slotsFilledThisMonth: stats.slots_filled,
    totalEarnedThisMonth: totalEarned,
  };
}

export function getCustomerById(
  barberId: number,
  id: string
): Customer | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT * FROM customers WHERE id = ? AND barber_id = ?")
      .get(id, barberId) as Customer) || null
  );
}

export function getCustomerAppointments(
  barberId: number,
  customerId: string
): Appointment[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM appointments 
       WHERE barber_id = ? AND customer_id = ? 
       ORDER BY date DESC, time DESC`
    )
    .all(barberId, customerId) as Appointment[];
}

export function getCalendarDay(
  barberId: number,
  date: string
): {
  appointments: Appointment[];
  emptySlots: EmptySlot[];
} {
  const db = getDb();
  const appointments = db
    .prepare(
      `SELECT * FROM appointments WHERE barber_id = ? AND date = ? ORDER BY time ASC`
    )
    .all(barberId, date) as Appointment[];
  const emptySlots = db
    .prepare(
      `SELECT * FROM empty_slots WHERE barber_id = ? AND date = ? ORDER BY start_time ASC`
    )
    .all(barberId, date) as EmptySlot[];
  return { appointments, emptySlots };
}

export function getRecentMessages(
  barberId: number,
  limit = 50
): WhatsAppMessage[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM whatsapp_messages 
       WHERE barber_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(barberId, limit) as WhatsAppMessage[];
}

export { WHATSAPP_TEMPLATES };
export { formatDateItalian, formatRequestDate, getToday } from "./format";
