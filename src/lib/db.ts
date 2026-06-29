import Database from "better-sqlite3";
import path from "path";
import { seedDatabase } from "./seed";

const DB_PATH = path.join(process.cwd(), "flexi.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
    seedDatabase(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      last_cut_date TEXT,
      total_cuts INTEGER DEFAULT 0,
      notes TEXT,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 45,
      status TEXT DEFAULT 'non_confermato',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS empty_slots (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 45,
      published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointment_requests (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      requested_date TEXT NOT NULL,
      requested_time TEXT NOT NULL,
      status TEXT DEFAULT 'da_gestire',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      message_type TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'simulated',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monthly_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      recovered_customers INTEGER DEFAULT 0,
      no_shows_avoided INTEGER DEFAULT 0,
      slots_filled INTEGER DEFAULT 0
    );

    INSERT OR IGNORE INTO monthly_stats (id) VALUES (1);
  `);
}
