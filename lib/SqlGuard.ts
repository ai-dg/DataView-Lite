import { ForbiddenSqlError, UnknownTableError } from './errors';

const FORBIDDEN = /\b(insert|update|delete|drop|alter|attach|create|replace|truncate|pragma)\b/i;

/**
 * Read-only safety net. The app NEVER constructs write SQL itself,
 * but this class exists so that any future code path is checked.
 */
export class SqlGuard {
  /** Throws if the SQL contains forbidden keywords. */
  static assertReadOnly(sql: string): void {
    if (FORBIDDEN.test(sql)) throw new ForbiddenSqlError();
  }

  /** Returns the table name quoted for SQLite, after checking it exists in the whitelist. */
  static safeTable(name: string, allowed: ReadonlyArray<string>): string {
    if (!allowed.includes(name)) throw new UnknownTableError(name);
    // SQLite identifier quoting: double-quote and escape any embedded quote.
    return `"${name.replace(/"/g, '""')}"`;
  }

  /** Quote an identifier (column) — caller must already trust it (from introspection). */
  static quoteIdent(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }
}
