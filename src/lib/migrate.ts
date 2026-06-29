import type Database from "better-sqlite3";

const MIGRATIONS: { version: number; up: (db: Database.Database) => void }[] = [
  {
    version: 1,
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY
        );

        CREATE TABLE IF NOT EXISTS barbers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          whatsapp_enabled INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);

      const tables = [
        "customers",
        "appointments",
        "empty_slots",
        "appointment_requests",
        "whatsapp_messages",
      ];

      for (const table of tables) {
        const cols = db
          .prepare(`PRAGMA table_info(${table})`)
          .all() as { name: string }[];
        if (!cols.some((c) => c.name === "barber_id")) {
          db.exec(
            `ALTER TABLE ${table} ADD COLUMN barber_id INTEGER NOT NULL DEFAULT 1`
          );
        }
      }

      const monthlyCols = db
        .prepare("PRAGMA table_info(monthly_stats)")
        .all() as { name: string }[];
      if (!monthlyCols.some((c) => c.name === "barber_id")) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS monthly_stats_new (
            barber_id INTEGER PRIMARY KEY,
            recovered_customers INTEGER DEFAULT 0,
            no_shows_avoided INTEGER DEFAULT 0,
            slots_filled INTEGER DEFAULT 0
          );
          INSERT OR IGNORE INTO monthly_stats_new (barber_id, recovered_customers, no_shows_avoided, slots_filled)
            SELECT 1, recovered_customers, no_shows_avoided, slots_filled FROM monthly_stats WHERE id = 1;
          DROP TABLE IF EXISTS monthly_stats;
          ALTER TABLE monthly_stats_new RENAME TO monthly_stats;
        `);
      }

      db.exec(`UPDATE customers SET barber_id = 1 WHERE barber_id IS NULL`);
      db.exec(`UPDATE appointments SET barber_id = 1 WHERE barber_id IS NULL`);
      db.exec(`UPDATE empty_slots SET barber_id = 1 WHERE barber_id IS NULL`);
      db.exec(
        `UPDATE appointment_requests SET barber_id = 1 WHERE barber_id IS NULL`
      );
      db.exec(
        `UPDATE whatsapp_messages SET barber_id = 1 WHERE barber_id IS NULL`
      );
    },
  },
  {
    version: 2,
    up(db) {
      const cols = db
        .prepare("PRAGMA table_info(appointments)")
        .all() as { name: string }[];
      if (!cols.some((c) => c.name === "reminder_sent_at")) {
        db.exec(
          `ALTER TABLE appointments ADD COLUMN reminder_sent_at TEXT`
        );
      }
      const custCols = db
        .prepare("PRAGMA table_info(customers)")
        .all() as { name: string }[];
      if (!custCols.some((c) => c.name === "recovery_sent_at")) {
        db.exec(
          `ALTER TABLE customers ADD COLUMN recovery_sent_at TEXT`
        );
      }
      db.exec(`
        CREATE TABLE IF NOT EXISTS cron_runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          barber_id INTEGER NOT NULL,
          job_type TEXT NOT NULL,
          ran_at TEXT DEFAULT (datetime('now')),
          details TEXT
        );
        CREATE TABLE IF NOT EXISTS inbound_messages (
          id TEXT PRIMARY KEY,
          barber_id INTEGER NOT NULL,
          customer_id TEXT,
          phone TEXT NOT NULL,
          body TEXT NOT NULL,
          action_taken TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
    },
  },
];

export function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY
    );
  `);

  const current = db
    .prepare("SELECT MAX(version) as v FROM schema_migrations")
    .get() as { v: number | null };
  const currentVersion = current.v ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      migration.up(db);
      db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(
        migration.version
      );
    }
  }
}
