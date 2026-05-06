'use client';

import { useRef, useState } from 'react';

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  uploading?: boolean;
  error?: string | null;
}

export function UploadDropzone({ onFile, uploading, error }: UploadDropzoneProps) {
  const input = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-white px-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={[
          'w-full max-w-xl rounded-lg border bg-white px-10 py-12 text-center transition-colors',
          dragOver
            ? 'border-accent-500 bg-accent-50/40'
            : 'border-slate-200 hover:border-slate-300',
          uploading ? 'opacity-70' : '',
        ].join(' ')}
      >
        <h1 className="text-lg font-semibold text-slate-900 mb-2">
          Importez une base pour commencer
        </h1>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
          DataView Lite ouvre votre fichier en lecture seule. Aucune donnée ne
          sera modifiée et rien ne quitte votre ordinateur.
        </p>

        <button
          onClick={() => !uploading && input.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          {uploading ? 'Chargement…' : 'Importer une base SQLite'}
        </button>

        <p className="text-xs text-slate-400 mt-4">
          Glisser-déposer accepté · Formats pris en charge : .db, .sqlite
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 mx-auto max-w-md rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-2.5"
          >
            {error}
          </div>
        )}

        <input
          ref={input}
          type="file"
          accept=".sqlite,.db,.sqlite3,application/x-sqlite3,application/vnd.sqlite3"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
