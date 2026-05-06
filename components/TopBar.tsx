'use client';

import { useRef } from 'react';

interface TopBarProps {
  onUpload: (file: File) => void;
  uploading?: boolean;
  databaseName?: string | null;
  onShowGuide?: () => void;
}

export function TopBar({
  onUpload,
  uploading = false,
  databaseName,
  onShowGuide,
}: TopBarProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);

  return (
    <header className="h-16 shrink-0 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
      <div className="flex items-baseline gap-3">
        <span className="text-base font-semibold text-slate-900 tracking-tight">
          DataView Lite
        </span>
        <span className="hidden sm:inline text-xs text-slate-500">
          Exploration sécurisée d’une base SQLite
        </span>
      </div>

      <div className="flex items-center gap-3">
        {onShowGuide && (
          <button
            onClick={onShowGuide}
            aria-label="Ouvrir le guide d’utilisation"
            title="Ouvrir le guide"
            className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 text-sm font-semibold transition-colors"
          >
            ?
          </button>
        )}
        {databaseName && (
          <span className="hidden md:inline text-xs text-slate-500 truncate max-w-[280px]">
            {databaseName}
          </span>
        )}

        <span
          title="La base est ouverte en lecture seule. Aucune donnée ne peut être modifiée."
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 select-none"
        >
          <LockIcon />
          Lecture seule
        </span>

        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          {uploading ? 'Chargement…' : databaseName ? 'Changer de base' : 'Importer une base'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".sqlite,.db,.sqlite3,application/x-sqlite3,application/vnd.sqlite3"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = '';
          }}
        />
      </div>
    </header>
  );
}

function LockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
