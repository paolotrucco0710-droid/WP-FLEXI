import { differenceInDays, parseISO, format, addDays } from "date-fns";
import { getDb } from "./db";
import { getToday } from "./format";
import { computeSlotsForDates, computeSlotsNextDays } from "./slots";
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

export async function getCustomersToRecover(
  barberId: number
): Promise<CustomerToRecover[]> {
  const db = await getDb();
  const customers = await db.all<Customer>(
    "SELECT * FROM customers WHERE barber_id = ? ORDER BY last_cut_date ASC",
    [barberId]
  );

  const today = new Date();
  return customers
    .filter((c) => {
      if (!c.last_cut_date) return true;
      return (
        differenceInDays(today, parseISO(String(c.last_cut_date))) >=
        RECOVERY_DAYS_THRESHOLD
      );
    })
    .map((c) => ({
      ...c,
      days_since_last_cut: c.last_cut_date
        ? differenceInDays(today, parseISO(String(c.last_cut_date)))
        : 999,
    }));
}

export async function getNoShowAtRisk(barberId: number): Promise<Appointment[]> {
  const db = await getDb();
  const today = getToday();
  return db.all<Appointment>(
    `SELECT * FROM appointments 
     WHERE barber_id = ? AND date = ? AND status IN ('non_confermato', 'rischio_no_show')
     ORDER BY time ASC`,
    [barberId, today]
  );
}

export async function getTomorrowAppointmentsForReminder(
  barberId: number
): Promise<Appointment[]> {
  const db = await getDb();
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  return db.all<Appointment>(
    `SELECT * FROM appointments 
     WHERE barber_id = ? AND date = ? 
     AND status IN ('non_confermato', 'rischio_no_show')
     ORDER BY time ASC`,
    [barberId, tomorrow]
  );
}

export async function getTodayAppointments(barberId: number) {
  const db = await getDb();
  const today = getToday();
  const all = await db.all<Appointment>(
    "SELECT * FROM appointments WHERE barber_id = ? AND date = ? ORDER BY time ASC",
    [barberId, today]
  );

  return {
    confirmed: all.filter((a) => a.status === "confermato"),
    unconfirmed: all.filter(
      (a) => a.status === "non_confermato" || a.status === "rischio_no_show"
    ),
  };
}

export async function getEmptySlots(barberId: number): Promise<EmptySlot[]> {
  return computeSlotsNextDays(barberId, 7);
}

export async function getPendingRequests(
  barberId: number
): Promise<AppointmentRequest[]> {
  const db = await getDb();
  return db.all<AppointmentRequest>(
    `SELECT * FROM appointment_requests 
     WHERE barber_id = ? AND status = 'da_gestire' 
     ORDER BY requested_date, requested_time`,
    [barberId]
  );
}

export async function getManagedRequests(
  barberId: number
): Promise<AppointmentRequest[]> {
  const db = await getDb();
  return db.all<AppointmentRequest>(
    `SELECT * FROM appointment_requests 
     WHERE barber_id = ? AND status != 'da_gestire' 
     ORDER BY created_at DESC LIMIT 20`,
    [barberId]
  );
}

export async function getDashboardStats(
  barberId: number
): Promise<DashboardStats> {
  const toRecover = await getCustomersToRecover(barberId);
  const noShow = await getNoShowAtRisk(barberId);
  const slots = await getEmptySlots(barberId);
  const { confirmed, unconfirmed } = await getTodayAppointments(barberId);
  const requests = await getPendingRequests(barberId);

  const db = await getDb();
  const monthly = await db.get<{
    recovered_customers: number;
    no_shows_avoided: number;
    slots_filled: number;
  }>("SELECT * FROM monthly_stats WHERE barber_id = ?", [barberId]);

  const stats = monthly ?? {
    recovered_customers: 0,
    no_shows_avoided: 0,
    slots_filled: 0,
  };

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
    totalEarnedThisMonth:
      stats.recovered_customers * EARNINGS.recovery +
      stats.no_shows_avoided * EARNINGS.noShowAvoided +
      stats.slots_filled * EARNINGS.slotFilled,
  };
}

export async function getCustomerById(
  barberId: number,
  id: string
): Promise<Customer | null> {
  const db = await getDb();
  return (
    (await db.get<Customer>(
      "SELECT * FROM customers WHERE id = ? AND barber_id = ?",
      [id, barberId]
    )) ?? null
  );
}

export async function getCustomerAppointments(
  barberId: number,
  customerId: string
): Promise<Appointment[]> {
  const db = await getDb();
  return db.all<Appointment>(
    `SELECT * FROM appointments 
     WHERE barber_id = ? AND customer_id = ? 
     ORDER BY date DESC, time DESC`,
    [barberId, customerId]
  );
}

export async function getCalendarDay(barberId: number, date: string) {
  const db = await getDb();
  const appointments = await db.all<Appointment>(
    `SELECT * FROM appointments WHERE barber_id = ? AND date = ? ORDER BY time ASC`,
    [barberId, date]
  );
  const emptySlots = await computeSlotsForDates(barberId, [date]);
  return { appointments, emptySlots };
}

export async function getRecentMessages(
  barberId: number,
  limit = 50
): Promise<WhatsAppMessage[]> {
  const db = await getDb();
  return db.all<WhatsAppMessage>(
    `SELECT * FROM whatsapp_messages 
     WHERE barber_id = ? ORDER BY created_at DESC LIMIT ?`,
    [barberId, limit]
  );
}

export { WHATSAPP_TEMPLATES };
export { formatDateItalian, formatRequestDate, getToday } from "./format";
