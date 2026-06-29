import { v4 as uuid } from "uuid";
import { format, addDays } from "date-fns";
import type { DbAdapter } from "./db/types";
import { hashPassword } from "./password";

const DEFAULT_EMAIL = "demo@flexi.local";
const DEFAULT_PASSWORD = process.env.FLEXI_DEFAULT_PASSWORD || "flexi123";

export async function ensureDefaultBarber(db: DbAdapter) {
  const count = await db.get<{ c: number }>(
    "SELECT COUNT(*) as c FROM barbers"
  );
  const c = count?.c ?? 0;
  if (c > 0) return;

  if (process.env.NODE_ENV === "production" && !process.env.FLEXI_SEED_DEMO) {
    return;
  }

  await db.run(
    `INSERT INTO barbers (email, password_hash, name, shop_name, onboarding_completed)
     VALUES (?, ?, ?, ?, ?)`,
    [DEFAULT_EMAIL, hashPassword(DEFAULT_PASSWORD), "Marco", "Barber Shop Demo", 1]
  );

  await db.run(
    `INSERT INTO monthly_stats (barber_id) VALUES (?) ON CONFLICT DO NOTHING`,
    [1]
  ).catch(() =>
    db.run(`INSERT OR IGNORE INTO monthly_stats (barber_id) VALUES (?)`, [1])
  );
}

export async function seedDatabase(db: DbAdapter) {
  const shouldSeed =
    process.env.FLEXI_SEED_DEMO === "1" ||
    (process.env.NODE_ENV === "development" && !usesPostgres());

  if (!shouldSeed || process.env.NODE_ENV === "production") return;

  const DEMO_BARBER_ID = 1;
  const count = await db.get<{ c: number }>(
    "SELECT COUNT(*) as c FROM customers WHERE barber_id = ?",
    [DEMO_BARBER_ID]
  );
  if ((count?.c ?? 0) > 0) return;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");

  const customers = [
    { name: "Marco Rossi", phone: "+39 333 1234567", daysAgo: 45, cuts: 12 },
    { name: "Luca Bianchi", phone: "+39 334 2345678", daysAgo: 38, cuts: 8 },
    { name: "Andrea Verdi", phone: "+39 335 3456789", daysAgo: 52, cuts: 15 },
    { name: "Giuseppe Neri", phone: "+39 336 4567890", daysAgo: 31, cuts: 6 },
    { name: "Francesco Blu", phone: "+39 337 5678901", daysAgo: 60, cuts: 20 },
    { name: "Alessandro Gialli", phone: "+39 338 6789012", daysAgo: 35, cuts: 10 },
    { name: "Matteo Rosa", phone: "+39 339 7890123", daysAgo: 42, cuts: 7 },
    { name: "Davide Viola", phone: "+39 340 8901234", daysAgo: 33, cuts: 5 },
    { name: "Simone Arancio", phone: "+39 341 9012345", daysAgo: 55, cuts: 18 },
    { name: "Roberto Grigio", phone: "+39 342 0123456", daysAgo: 40, cuts: 9 },
    { name: "Paolo Celeste", phone: "+39 343 1234560", daysAgo: 36, cuts: 11 },
    { name: "Stefano Marrone", phone: "+39 344 2345601", daysAgo: 48, cuts: 14 },
    { name: "Tommaso Verde", phone: "+39 345 3456012", daysAgo: 5, cuts: 3 },
    { name: "Nicola Rosso", phone: "+39 346 4560123", daysAgo: 12, cuts: 4 },
    { name: "Fabio Bianco", phone: "+39 347 5601234", daysAgo: 20, cuts: 6 },
  ];

  const customerIds: string[] = [];
  for (const c of customers) {
    const id = uuid();
    customerIds.push(id);
    const lastCut = format(addDays(today, -c.daysAgo), "yyyy-MM-dd");
    await db.run(
      `INSERT INTO customers (id, barber_id, name, phone, last_cut_date, total_cuts, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        DEMO_BARBER_ID,
        c.name,
        c.phone,
        lastCut,
        c.cuts,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.name)}`,
      ]
    );
  }

  const appts = [
    { idx: 12, time: "10:00", status: "confermato", date: todayStr },
    { idx: 13, time: "11:30", status: "confermato", date: todayStr },
    { idx: 0, time: "14:00", status: "non_confermato", date: todayStr },
    { idx: 1, time: "15:30", status: "non_confermato", date: todayStr },
    { idx: 2, time: "17:00", status: "rischio_no_show", date: todayStr },
    { idx: 3, time: "11:30", status: "confermato", date: tomorrowStr },
    { idx: 4, time: "15:00", status: "non_confermato", date: tomorrowStr },
  ];

  for (const a of appts) {
    await db.run(
      `INSERT INTO appointments (id, barber_id, customer_id, customer_name, date, time, duration_minutes, status)
       VALUES (?, ?, ?, ?, ?, ?, 45, ?)`,
      [
        uuid(),
        DEMO_BARBER_ID,
        customerIds[a.idx],
        customers[a.idx].name,
        a.date,
        a.time,
        a.status,
      ]
    );
  }

  await db.run(
    `UPDATE monthly_stats SET recovered_customers = 7, no_shows_avoided = 4, slots_filled = 5 WHERE barber_id = ?`,
    [DEMO_BARBER_ID]
  );
}

function usesPostgres(): boolean {
  return !!process.env.DATABASE_URL;
}

export { DEFAULT_EMAIL, DEFAULT_PASSWORD };
