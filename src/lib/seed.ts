import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import { format, subDays, addDays } from "date-fns";
import { hashPassword } from "./auth";
import { syncEmptySlotsNextDays } from "./slots";

const DEFAULT_EMAIL = "demo@flexi.local";
const DEFAULT_PASSWORD = process.env.FLEXI_DEFAULT_PASSWORD || "flexi123";
const DEMO_BARBER_ID = 1;

export function ensureDefaultBarber(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as c FROM barbers").get() as {
    c: number;
  };
  if (count.c > 0) return;

  db.prepare(
    `INSERT INTO barbers (email, password_hash, name, whatsapp_enabled)
     VALUES (?, ?, ?, 0)`
  ).run(DEFAULT_EMAIL, hashPassword(DEFAULT_PASSWORD), "Marco");

  db.prepare(
    `INSERT OR IGNORE INTO monthly_stats (barber_id) VALUES (?)`
  ).run(DEMO_BARBER_ID);
}

export function seedDatabase(db: Database.Database) {
  const shouldSeed =
    process.env.FLEXI_SEED_DEMO === "1" ||
    process.env.NODE_ENV === "development";

  if (!shouldSeed) return;

  const count = db
    .prepare("SELECT COUNT(*) as c FROM customers WHERE barber_id = ?")
    .get(DEMO_BARBER_ID) as { c: number };
  if (count.c > 0) return;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");

  const customers = [
    { name: "Marco Rossi", phone: "+39 333 1234567", daysAgo: 45, cuts: 12, notes: "Preferisce sfumature alte ai lati" },
    { name: "Luca Bianchi", phone: "+39 334 2345678", daysAgo: 38, cuts: 8, notes: null },
    { name: "Andrea Verdi", phone: "+39 335 3456789", daysAgo: 52, cuts: 15, notes: "Cliente fedele dal 2020" },
    { name: "Giuseppe Neri", phone: "+39 336 4567890", daysAgo: 31, cuts: 6, notes: null },
    { name: "Francesco Blu", phone: "+39 337 5678901", daysAgo: 60, cuts: 20, notes: "Barba ogni 2 settimane" },
    { name: "Alessandro Gialli", phone: "+39 338 6789012", daysAgo: 35, cuts: 10, notes: null },
    { name: "Matteo Rosa", phone: "+39 339 7890123", daysAgo: 42, cuts: 7, notes: null },
    { name: "Davide Viola", phone: "+39 340 8901234", daysAgo: 33, cuts: 5, notes: null },
    { name: "Simone Arancio", phone: "+39 341 9012345", daysAgo: 55, cuts: 18, notes: null },
    { name: "Roberto Grigio", phone: "+39 342 0123456", daysAgo: 40, cuts: 9, notes: null },
    { name: "Paolo Celeste", phone: "+39 343 1234560", daysAgo: 36, cuts: 11, notes: null },
    { name: "Stefano Marrone", phone: "+39 344 2345601", daysAgo: 48, cuts: 14, notes: null },
    { name: "Tommaso Verde", phone: "+39 345 3456012", daysAgo: 5, cuts: 3, notes: "Nuovo cliente" },
    { name: "Nicola Rosso", phone: "+39 346 4560123", daysAgo: 12, cuts: 4, notes: null },
    { name: "Fabio Bianco", phone: "+39 347 5601234", daysAgo: 20, cuts: 6, notes: null },
  ];

  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, barber_id, name, phone, last_cut_date, total_cuts, notes, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const customerIds: string[] = [];
  for (const c of customers) {
    const id = uuid();
    customerIds.push(id);
    insertCustomer.run(
      id,
      DEMO_BARBER_ID,
      c.name,
      c.phone,
      format(subDays(today, c.daysAgo), "yyyy-MM-dd"),
      c.cuts,
      c.notes,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.name)}`
    );
  }

  const insertAppt = db.prepare(`
    INSERT INTO appointments (id, barber_id, customer_id, customer_name, date, time, duration_minutes, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const todayAppointments = [
    { idx: 12, time: "10:00", status: "confermato" },
    { idx: 13, time: "11:30", status: "confermato" },
    { idx: 0, time: "14:00", status: "non_confermato" },
    { idx: 1, time: "15:30", status: "non_confermato" },
    { idx: 2, time: "17:00", status: "rischio_no_show" },
  ];

  for (const a of todayAppointments) {
    insertAppt.run(
      uuid(),
      DEMO_BARBER_ID,
      customerIds[a.idx],
      customers[a.idx].name,
      todayStr,
      a.time,
      45,
      a.status,
      null
    );
  }

  insertAppt.run(uuid(), DEMO_BARBER_ID, customerIds[3], customers[3].name, tomorrowStr, "11:30", 45, "confermato", null);
  insertAppt.run(uuid(), DEMO_BARBER_ID, customerIds[4], customers[4].name, tomorrowStr, "15:00", 45, "non_confermato", null);

  const insertRequest = db.prepare(`
    INSERT INTO appointment_requests (id, barber_id, customer_id, customer_name, customer_phone, requested_date, requested_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'da_gestire')
  `);
  insertRequest.run(uuid(), DEMO_BARBER_ID, customerIds[5], customers[5].name, customers[5].phone, tomorrowStr, "11:30");
  insertRequest.run(uuid(), DEMO_BARBER_ID, customerIds[6], customers[6].name, customers[6].phone, tomorrowStr, "16:00");
  insertRequest.run(uuid(), DEMO_BARBER_ID, customerIds[7], customers[7].name, customers[7].phone, format(addDays(today, 2), "yyyy-MM-dd"), "10:30");

  db.prepare(
    `UPDATE monthly_stats SET recovered_customers = 7, no_shows_avoided = 4, slots_filled = 5 WHERE barber_id = ?`
  ).run(DEMO_BARBER_ID);

  syncEmptySlotsNextDays(DEMO_BARBER_ID, 7);
}

export { DEFAULT_EMAIL, DEFAULT_PASSWORD };
