import { ForbiddenSqlError } from './errors';

const FORBIDDEN_KEYWORDS =
  /\b(insert|update|delete|drop|alter|create|replace|attach|detach|vacuum|pragma|truncate)\b/i;

/**
 * Validates an LLM-generated SQL string before execution.
 * The Database wrapper also opens SQLite in read-only mode, so this is the
 * second line of defense.
 */
export class SqlValidator {
  static assertSafeSelect(rawSql: string): string {
    const sql = rawSql.trim().replace(/;\s*$/, '');

    if (!sql) throw new ForbiddenSqlError();

    // Must start with SELECT or WITH (case-insensitive).
    if (!/^(select|with)\b/i.test(sql)) throw new ForbiddenSqlError();

    // Reject any embedded statement separator that has more SQL after it.
    if (/;[\s\S]*\S/.test(sql)) throw new ForbiddenSqlError();

    if (FORBIDDEN_KEYWORDS.test(sql)) throw new ForbiddenSqlError();

    return sql;
  }
}
