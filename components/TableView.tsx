'use client';

import type { CellValue, Column, TableInfo } from '@/lib/types';

interface TableViewProps {
  table: TableInfo;
  rows: Record<string, CellValue>[];
  query: string;
  loading?: boolean;
}

function formatCell(value: CellValue, type: Column['type']): string {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'bool') return value ? 'Oui' : 'Non';
  if (type === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n)
      ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
      : String(value);
  }
  return String(value);
}

export function TableView({ table, rows, query, loading }: TableViewProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm bg-white">
        Chargement des données…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm bg-white px-6">
        {query ? (
          <div className="text-center max-w-md">
            <div className="text-slate-700 font-medium mb-1">
              Aucun résultat ne correspond à cette recherche.
            </div>
            <div className="text-slate-500">
              Essayez un autre mot, ou retirez le filtre « {query} ».
            </div>
          </div>
        ) : (
          <div className="text-slate-500">Cette table ne contient aucune donnée.</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 sticky top-0 z-10">
            {table.columns.map((c) => (
              <th
                key={c.key}
                className="text-left font-semibold text-slate-600 px-4 py-2.5 border-b border-slate-200 whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-slate-50 transition-colors"
            >
              {table.columns.map((c) => (
                <td
                  key={c.key}
                  className="px-4 py-2.5 border-b border-slate-100 text-slate-800 whitespace-nowrap max-w-[320px] overflow-hidden text-ellipsis"
                  title={String(row[c.key] ?? '')}
                >
                  {formatCell(row[c.key], c.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
