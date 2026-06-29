import { Pool } from "pg";
import type { DbAdapter, DbRunResult } from "./types";
import { convertPlaceholders } from "./types";

export class PostgresAdapter implements DbAdapter {
  readonly dialect = "postgres" as const;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : { rejectUnauthorized: false },
    });
  }

  private async query(sql: string, params: unknown[] = []) {
    const pgSql = convertPlaceholders(sql, "postgres");
    return this.pool.query(pgSql, params);
  }

  async exec(sql: string, params: unknown[] = []): Promise<void> {
    await this.query(sql, params);
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const result = await this.query(sql, params);
    return result.rows[0] as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.query(sql, params);
    return result.rows as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<DbRunResult> {
    const result = await this.query(sql, params);
    return { changes: result.rowCount ?? 0 };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createPostgresAdapter(connectionString: string): PostgresAdapter {
  return new PostgresAdapter(connectionString);
}
