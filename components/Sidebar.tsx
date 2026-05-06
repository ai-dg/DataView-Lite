'use client';

import type { TableInfo } from '@/lib/types';

interface SidebarProps {
  tables: TableInfo[];
  activeName: string | null;
  onSelect: (name: string) => void;
  width: number;
}

export function Sidebar({ tables, activeName, onSelect, width }: SidebarProps) {
  return (
    <aside
      style={{ width: `${width}px` }}
      className="shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col"
    >
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">
          Tables
        </h2>
      </div>

      {tables.length === 0 ? (
        <div className="px-5 pb-5 text-sm text-slate-500">
          Aucune table à afficher pour le moment.
        </div>
      ) : (
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {tables.map((t) => {
            const active = t.name === activeName;
            return (
              <button
                key={t.name}
                onClick={() => onSelect(t.name)}
                className={[
                  'group relative w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors',
                  active
                    ? 'bg-white text-slate-900 shadow-soft'
                    : 'text-slate-700 hover:bg-white/70',
                ].join(' ')}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent-600" />
                )}
                <span className="pl-2 text-sm font-medium truncate">{t.label}</span>
                <span
                  className={[
                    'text-xs tabular-nums',
                    active ? 'text-slate-500' : 'text-slate-400',
                  ].join(' ')}
                >
                  {t.rowCount.toLocaleString('fr-FR')} lignes
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
