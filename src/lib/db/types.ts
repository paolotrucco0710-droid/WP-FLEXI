export interface DbRunResult {
  changes: number;
}

export interface DbAdapter {
  readonly dialect: "sqlite" | "postgres";
  exec(sql: string, params?: unknown[]): Promise<void>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<DbRunResult>;
  close(): Promise<void>;
}

export function convertPlaceholders(sql: string, dialect: "sqlite" | "postgres"): string {
  if (dialect === "sqlite") return sql;
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}
