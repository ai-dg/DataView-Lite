import type { Database } from './Database';
import { Humanizer } from './Humanizer';
import { SqlGuard } from './SqlGuard';
import type { Column, ColumnType, TableInfo } from './types';

interface PragmaRow {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
}

/**
 * Walks sqlite_master + PRAGMA table_info to build a typed Schema.
 * Generic by design: never references any table or column by name.
 */
export class Introspector {
  constructor(
    private readonly db: Database,
    private readonly humanizer = new Humanizer(),
  ) {}

  listTables(): TableInfo[] {
    const rawTables = this.db.all<{ name: string }>(
      `SELECT name FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
          AND name NOT IN ('sqlite_sequence')
        ORDER BY name`,
    );

    return rawTables.map((t) => this.#describeTable(t.name));
  }

  #describeTable(name: string): TableInfo {
    const columns = this.#columns(name);
    const rowCount = this.#rowCount(name);
    return {
      name,
      label: this.humanizer.humanizeTable(name),
      rowCount,
      columns,
    };
  }

  #columns(table: string): Column[] {
    // PRAGMA only takes a literal; we already trust `table` (from sqlite_master),
    // but quote it defensively.
    const rows = this.db.all<PragmaRow>(
      `SELECT cid, name, type, "notnull", dflt_value, pk
         FROM pragma_table_info(?)`,
      [table],
    );

    return rows.map((r) => ({
      key: r.name,
      label: this.humanizer.humanizeColumn(r.name),
      type: this.#mapType(r.type, r.name),
    }));
  }

  #rowCount(table: string): number {
    const quoted = SqlGuard.quoteIdent(table);
    const row = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${quoted}`);
    return row?.n ?? 0;
  }

  #mapType(rawType: string, columnName: string): ColumnType {
    const t = (rawType || '').toLowerCase();
    if (/(int|real|num|decimal|double|float)/.test(t)) return 'number';
    if (/(date|time)/.test(t) || /(_at|_on|date)$/i.test(columnName)) return 'date';
    if (/bool/.test(t) || /^is_/i.test(columnName)) return 'bool';
    return 'text';
  }
}
