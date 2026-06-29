import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { DbAdapter, DbRunResult } from "./types";
import { convertPlaceholders } from "./types";

export class SqliteAdapter implements DbAdapter {
  readonly dialect = "sqlite" as const;
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
  }

  async exec(sql: string, params: unknown[] = []): Promise<void> {
    this.db.prepare(sql).run(...params);
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<DbRunResult> {
    const result = this.db.prepare(sql).run(...params);
    return { changes: result.changes };
  }

  getRaw(): Database.Database {
    return this.db;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

export function createSqliteAdapter(dbPath: string): SqliteAdapter {
  return new SqliteAdapter(dbPath);
}

export { convertPlaceholders };
