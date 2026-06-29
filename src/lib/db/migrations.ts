import type { DbAdapter } from "./types";

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS barbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  shop_name TEXT,
  whatsapp_enabled INTEGER DEFAULT 0,
  whatsapp_phone_id TEXT,
  whatsapp_api_token TEXT,
  whatsapp_verified INTEGER DEFAULT 0,
  onboarding_completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  barber_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  last_cut_date TEXT,
  total_cuts INTEGER DEFAULT 0,
  notes TEXT,
  avatar_url TEXT,
  recovery_sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  barber_id INTEGER NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  status TEXT DEFAULT 'non_confermato',
  notes TEXT,
  reminder_sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointment_requests (
  id TEXT PRIMARY KEY,
  barber_id INTEGER NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  requested_date TEXT NOT NULL,
  requested_time TEXT NOT NULL,
  status TEXT DEFAULT 'da_gestire',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id TEXT PRIMARY KEY,
  barber_id INTEGER NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'simulated',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  idempotency_key TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS published_slots (
  barber_id INTEGER NOT NULL,
  slot_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  published_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (barber_id, slot_date, start_time)
);

CREATE TABLE IF NOT EXISTS monthly_stats (
  barber_id INTEGER PRIMARY KEY,
  recovered_customers INTEGER DEFAULT 0,
  no_shows_avoided INTEGER DEFAULT 0,
  slots_filled INTEGER DEFAULT 0
);

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
  idempotency_key TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

const MIGRATIONS: { version: number; sqlite: string[]; postgres: string[] }[] = [
  {
    version: 1,
    sqlite: [
      `CREATE INDEX IF NOT EXISTS idx_customers_barber ON customers(barber_id)`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, date)`,
    ],
    postgres: [],
  },
  {
    version: 2,
    sqlite: [
      `DROP TABLE IF EXISTS empty_slots`,
    ],
    postgres: [],
  },
];

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
}

export async function initSchema(adapter: DbAdapter): Promise<void> {
  if (adapter.dialect === "postgres") {
    const { POSTGRES_SCHEMA } = await import("./postgres-schema");
    for (const stmt of splitStatements(POSTGRES_SCHEMA)) {
      await adapter.exec(stmt);
    }
  } else {
    for (const stmt of splitStatements(SQLITE_SCHEMA)) {
      await adapter.exec(stmt);
    }
  }

  const current = await adapter.get<{ v: number | null }>(
    "SELECT MAX(version) as v FROM schema_migrations"
  );
  const currentVersion = current?.v ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      const statements =
        adapter.dialect === "postgres" ? migration.postgres : migration.sqlite;
      for (const sql of statements) {
        if (sql.trim()) await adapter.exec(sql);
      }
      await adapter.run(
        "INSERT INTO schema_migrations (version) VALUES (?)",
        [migration.version]
      );
    }
  }
}
