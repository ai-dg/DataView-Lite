'use client';

import type { CellValue, Column, TableInfo } from '@/lib/types';

interface TableSummaryProps {
  table: TableInfo;
  sampleRows: Record<string, CellValue>[];
}

/**
 * Heuristic, schema-driven summary of the active table.
 * No business knowledge: relies only on column names, types and sample values.
 */
export function TableSummary({ table, sampleRows }: TableSummaryProps) {
  const sentences = buildSentences(table, sampleRows);
  if (sentences.length === 0) return null;

  return (
    <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/40">
      <p className="text-sm text-slate-600 leading-relaxed">
        {sentences.map((s, i) => (
          <span key={i}>
            {s}
            {i < sentences.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
    </div>
  );
}

function buildSentences(
  table: TableInfo,
  sampleRows: Record<string, CellValue>[],
): string[] {
  const out: string[] = [];

  // 1. Volume + dimensions.
  out.push(
    `Cette table contient ${table.rowCount.toLocaleString('fr-FR')} ${pluralize(
      'ligne',
      table.rowCount,
    )} et ${table.columns.length} ${pluralize('champ', table.columns.length)}.`,
  );

  // 2. Up to 4 "main fields" — skip technical-looking columns.
  const mainFields = pickMainFields(table.columns);
  if (mainFields.length >= 2) {
    out.push(
      `Champs principaux : ${mainFields
        .slice(0, 4)
        .map((c) => c.label)
        .join(', ')}.`,
    );
  }

  // 3. Hint about detected shapes.
  const hints = detectShapeHints(table, sampleRows);
  if (hints) out.push(hints);

  return out;
}

function pickMainFields(columns: Column[]): Column[] {
  return columns
    .filter((c) => !isLikelyTechnical(c))
    .slice(0, 6);
}

function isLikelyTechnical(c: Column): boolean {
  if (/^id$/i.test(c.key)) return true;
  if (/_id$/i.test(c.key)) return true;
  if (/^(uuid|guid|hash|fk_)/i.test(c.key)) return true;
  return false;
}

function detectShapeHints(
  table: TableInfo,
  sampleRows: Record<string, CellValue>[],
): string | null {
  const hasDate = table.columns.some(
    (c) => c.type === 'date' || /(_at|_on|date|year)$/i.test(c.key),
  );
  const hasStatus = table.columns.some((c) =>
    /(status|statut|state|paid|paye|active|actif|ok)$/i.test(c.key),
  );
  const hasMoney = table.columns.some((c) =>
    /(amount|amt|total|price|prix|montant|eur|usd)$/i.test(c.key),
  );

  // Refine with sample values: e.g. text column with mostly URL/email/city pattern.
  const hasEmail = anySampleMatches(sampleRows, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  const hasCity = table.columns.some((c) => /(city|ville|town|locality)$/i.test(c.key));

  const detected: string[] = [];
  if (hasDate) detected.push('des dates');
  if (hasStatus) detected.push('un statut');
  if (hasMoney) detected.push('un montant');
  if (hasEmail) detected.push('des e-mails');
  if (hasCity) detected.push('des villes');

  if (detected.length === 0) return null;
  return `Champs détectés : ${joinFrenchList(detected)}.`;
}

function anySampleMatches(
  rows: Record<string, CellValue>[],
  re: RegExp,
): boolean {
  for (const row of rows.slice(0, 10)) {
    for (const v of Object.values(row)) {
      if (typeof v === 'string' && re.test(v)) return true;
    }
  }
  return false;
}

function joinFrenchList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} et ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

function pluralize(noun: string, n: number): string {
  return n > 1 ? `${noun}s` : noun;
}
