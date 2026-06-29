#!/usr/bin/env npx tsx
/**
 * Migra dati da SQLite locale a PostgreSQL (DATABASE_URL richiesto).
 * Usage: DATABASE_URL=postgres://... npx tsx scripts/migrate-sqlite-to-postgres.ts [sqlite-path]
 */
import Database from "better-sqlite3";
import { createPostgresAdapter } from "../src/lib/db/postgres-adapter";
import { initSchema } from "../src/lib/db/migrations";
import path from "path";

const SQLITE_PATH =
  process.argv[2] || path.join(process.cwd(), "flexi.db");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL richiesto");
  process.exit(1);
}

const TABLES = [
  "barbers",
  "customers",
  "appointments",
  "appointment_requests",
  "whatsapp_messages",
  "monthly_stats",
  "cron_runs",
  "inbound_messages",
  "published_slots",
] as const;

async function main() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pg = createPostgresAdapter(DATABASE_URL!);
  await initSchema(pg);

  for (const table of TABLES) {
    try {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<
        string,
        unknown
      >[];
      if (rows.length === 0) continue;

      const cols = Object.keys(rows[0]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      for (const row of rows) {
        await pg.run(sql, cols.map((c) => row[c]));
      }
      console.log(`✓ ${table}: ${rows.length} righe`);
    } catch (e) {
      console.warn(`⚠ ${table}: skip (${e instanceof Error ? e.message : e})`);
    }
  }

  await pg.close();
  sqlite.close();
  console.log("Migrazione completata.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
