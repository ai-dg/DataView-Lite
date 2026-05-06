import BetterSqlite3 from 'better-sqlite3';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import { SqlGuard } from './SqlGuard';
import type { CellValue } from './types';

/**
 * Thin wrapper around better-sqlite3. Always opens in read-only mode.
 * Every call goes through SqlGuard.assertReadOnly as a safety net.
 */
export class Database {
  readonly #db: BetterSqlite3Database;

  constructor(filePath: string) {
    this.#db = new BetterSqlite3(filePath, { readonly: true, fileMustExist: true });
  }

  all<T = Record<string, CellValue>>(sql: string, params: unknown[] = []): T[] {
    SqlGuard.assertReadOnly(sql);
    return this.#db.prepare(sql).all(...(params as never[])) as T[];
  }

  get<T = Record<string, CellValue>>(sql: string, params: unknown[] = []): T | undefined {
    SqlGuard.assertReadOnly(sql);
    return this.#db.prepare(sql).get(...(params as never[])) as T | undefined;
  }

  close(): void {
    try {
      this.#db.close();
    } catch {
      // best effort
    }
  }
}
