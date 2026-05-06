import { NextResponse } from 'next/server';
import { DatabaseRegistry } from '@/lib/DatabaseRegistry';
import { SqlGuard } from '@/lib/SqlGuard';
import {
  UnknownDatabaseError,
  UnknownTableError,
  ForbiddenSqlError,
} from '@/lib/errors';
import type { CellValue, RowsPayload, TableInfo } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 10_000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dbId = searchParams.get('dbId');
  const tableName = searchParams.get('table');
  const q = (searchParams.get('q') ?? '').trim();
  const limit = clamp(intParam(searchParams.get('limit'), DEFAULT_LIMIT), 1, MAX_LIMIT);
  const offset = Math.max(0, intParam(searchParams.get('offset'), 0));

  if (!dbId || !tableName) {
    return NextResponse.json(
      { error: 'Paramètres dbId et table requis.' },
      { status: 400 },
    );
  }

  try {
    const entry = DatabaseRegistry.instance().get(dbId);
    const allowed = entry.tables.map((t) => t.name);
    const quoted = SqlGuard.safeTable(tableName, allowed);
    const tableInfo = entry.tables.find((t) => t.name === tableName) as TableInfo;

    const { whereSql, params } = buildSearch(tableInfo, q);

    const total = entry.db.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${quoted} ${whereSql}`,
      params,
    )?.n ?? 0;

    const rows = entry.db.all<Record<string, CellValue>>(
      `SELECT * FROM ${quoted} ${whereSql} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const payload: RowsPayload = { rows, total, limit, offset };
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof UnknownDatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof UnknownTableError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ForbiddenSqlError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Impossible de lire les données.' },
      { status: 500 },
    );
  }
}

function intParam(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function buildSearch(table: TableInfo, q: string): { whereSql: string; params: unknown[] } {
  if (!q) return { whereSql: '', params: [] };
  // Generic search: cast every column to text, OR them together.
  // Limited to a sane amount of columns to keep the query small.
  const cols = table.columns.slice(0, 20);
  if (cols.length === 0) return { whereSql: '', params: [] };

  const clauses = cols
    .map((c) => `CAST(${SqlGuard.quoteIdent(c.key)} AS TEXT) LIKE ?`)
    .join(' OR ');
  const params = cols.map(() => `%${q}%`);
  return { whereSql: `WHERE ${clauses}`, params };
}
