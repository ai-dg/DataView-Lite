import type { CellValue, Column } from './types';

/**
 * Browser-side CSV exporter. Produces an Excel-friendly file:
 * UTF-8 with BOM, semicolon separator, French booleans and dates.
 */
export class CsvExporter {
  constructor(private readonly delimiter: string = ';') {}

  /** Returns a Blob ready to be downloaded. */
  build(columns: Column[], rows: Record<string, CellValue>[]): Blob {
    const header = columns.map((c) => this.#escape(c.label)).join(this.delimiter);
    const body = rows
      .map((row) =>
        columns.map((c) => this.#format(row[c.key], c.type)).join(this.delimiter),
      )
      .join('\r\n');
    const bom = '﻿';
    return new Blob([bom, header, '\r\n', body], {
      type: 'text/csv;charset=utf-8',
    });
  }

  /** Triggers a download in the current browser tab. */
  download(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /** Friendly slug-based filename. */
  static filename(tableLabel: string): string {
    const slug = slugify(tableLabel) || 'table';
    return `dataview-lite-${slug}.csv`;
  }

  #format(value: CellValue, type: Column['type']): string {
    if (value === null || value === undefined || value === '') return '';
    if (type === 'bool') return value ? 'Oui' : 'Non';
    if (type === 'date') return this.#toFrenchDate(String(value));
    return this.#escape(String(value));
  }

  #escape(s: string): string {
    if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  #toFrenchDate(raw: string): string {
    // Accepts ISO (YYYY-MM-DD) or already-formatted FR dates.
    const iso = raw.slice(0, 10);
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return raw;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
