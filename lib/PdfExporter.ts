import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CellValue, Column } from './types';

/**
 * Browser-side PDF exporter. Produces a sober, printable A4 document with
 * humanized headers, French formatting and a "lecture seule" footer.
 */
export class PdfExporter {
  build(
    tableLabel: string,
    columns: Column[],
    rows: Record<string, CellValue>[],
    filter?: string,
  ): Blob {
    const orientation = columns.length > 6 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    this.#header(doc, tableLabel, rows.length, filter);

    autoTable(doc, {
      startY: 32,
      head: [columns.map((c) => c.label)],
      body: rows.map((row) =>
        columns.map((c) => this.#format(row[c.key], c.type)),
      ),
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: 30,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      didDrawPage: (data) => {
        this.#footer(doc, data.pageNumber, doc.getNumberOfPages());
      },
      margin: { left: 14, right: 14, top: 14, bottom: 14 },
    });

    return doc.output('blob');
  }

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

  static filename(tableLabel: string): string {
    const slug = slugify(tableLabel) || 'table';
    return `dataview-lite-${slug}.pdf`;
  }

  // ---------------------------------------------------------------------------

  #header(doc: jsPDF, title: string, rowCount: number, filter?: string): void {
    doc.setFontSize(14);
    doc.setTextColor(15);
    doc.text(title, 14, 16);

    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Extrait du ${this.#today()}`, 14, 22);

    const meta = filter
      ? `${rowCount} ${this.#plural('ligne', rowCount)} · filtre actif : "${filter}"`
      : `${rowCount} ${this.#plural('ligne', rowCount)}`;
    doc.text(meta, 14, 27);
    doc.setTextColor(0);
  }

  #footer(doc: jsPDF, page: number, total: number): void {
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Page ${page} / ${total}`, 14, h - 8);
    doc.text('Mode lecture seule — DataView Lite', w - 14, h - 8, {
      align: 'right',
    });
    doc.setTextColor(0);
  }

  #format(value: CellValue, type: Column['type']): string {
    if (value === null || value === undefined || value === '') return '';
    if (type === 'bool') return value ? 'Oui' : 'Non';
    if (type === 'date') return this.#toFrenchDate(String(value));
    if (type === 'number') {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n)
        ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
        : String(value);
    }
    return String(value);
  }

  #today(): string {
    return new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  #toFrenchDate(raw: string): string {
    const iso = raw.slice(0, 10);
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return raw;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  #plural(noun: string, n: number): string {
    return n > 1 ? `${noun}s` : noun;
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
