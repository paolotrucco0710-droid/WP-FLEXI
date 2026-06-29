import path from "path";
import fs from "fs";
import type { DbAdapter } from "./types";
import { createPostgresAdapter } from "./postgres-adapter";
import { createSqliteAdapter } from "./sqlite-adapter";
import { initSchema } from "./migrations";
import { ensureDefaultBarber, seedDatabase } from "../seed";

let adapter: DbAdapter | null = null;
let initPromise: Promise<DbAdapter> | null = null;

function resolveSqlitePath(): string {
  if (process.env.FLEXI_DB_PATH) return process.env.FLEXI_DB_PATH;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "flexi.db");
  }
  return path.join(process.cwd(), "flexi.db");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function usesPostgres(): boolean {
  return !!process.env.DATABASE_URL;
}

export function isDbWritable(): boolean {
  if (usesPostgres()) return true;
  try {
    const dbPath = resolveSqlitePath();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function createAdapter(): Promise<DbAdapter> {
  if (process.env.DATABASE_URL) {
    return createPostgresAdapter(process.env.DATABASE_URL);
  }

  if (isProduction() && !process.env.ALLOW_SQLITE_PROD) {
    throw new Error(
      "DATABASE_URL richiesto in produzione. SQLite consentito solo in dev."
    );
  }

  if (!isDbWritable()) {
    throw new Error("Database SQLite non scrivibile.");
  }

  return createSqliteAdapter(resolveSqlitePath());
}

export async function getDb(): Promise<DbAdapter> {
  if (adapter) return adapter;

  if (!initPromise) {
    initPromise = (async () => {
      const db = await createAdapter();
      await initSchema(db);
      await ensureDefaultBarber(db);
      await seedDatabase(db);
      adapter = db;
      return db;
    })();
  }

  return initPromise;
}

export async function closeDb(): Promise<void> {
  if (adapter) {
    await adapter.close();
    adapter = null;
    initPromise = null;
  }
}

export function getDbPath(): string {
  return usesPostgres() ? process.env.DATABASE_URL! : resolveSqlitePath();
}
