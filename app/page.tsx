'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { Sidebar } from '@/components/Sidebar';
import { SearchBar } from '@/components/SearchBar';
import { TableView } from '@/components/TableView';
import { TableSummary } from '@/components/TableSummary';
import { AssistantChat } from '@/components/AssistantChat';
import { Footer } from '@/components/Footer';
import { UploadDropzone } from '@/components/UploadDropzone';
import { Toast } from '@/components/Toast';
import { ResizeHandle } from '@/components/ResizeHandle';
import { Onboarding } from '@/components/Onboarding';
import { CsvExporter } from '@/lib/CsvExporter';
import { PdfExporter } from '@/lib/PdfExporter';
import { api } from '@/lib/api';
import { useResizableWidth } from '@/lib/useResizableWidth';
import type { CellValue, RowsPayload, TableInfo } from '@/lib/types';

const PAGE_SIZE = 50;
const MAX_EXPORT_ROWS = 10_000;

const STARTER_QUESTIONS = [
  'Combien de lignes contient cette table ?',
  'Résume cette table',
  'Montre les derniers enregistrements',
];

export default function Home() {
  // database state
  const [dbId, setDbId] = useState<string | null>(null);
  const [databaseName, setDatabaseName] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [activeName, setActiveName] = useState<string | null>(null);

  // upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // table state
  const [rowsPayload, setRowsPayload] = useState<RowsPayload | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // ux state
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'info' } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Auto-open the guide on the user's very first visit.
  useEffect(() => {
    try {
      const seen = window.localStorage.getItem('dvl.onboardingSeen');
      if (!seen) setShowGuide(true);
    } catch {
      // localStorage unavailable → just skip auto-open
    }
  }, []);

  const closeGuide = () => {
    setShowGuide(false);
    try {
      window.localStorage.setItem('dvl.onboardingSeen', '1');
    } catch {
      // ignore
    }
  };

  // Resizable panels
  const sidebarResize = useResizableWidth({
    storageKey: 'dvl.sidebarWidth',
    min: 180,
    max: 360,
    initial: 240,
  });
  const assistantResize = useResizableWidth({
    storageKey: 'dvl.assistantWidth',
    min: 280,
    max: 560,
    initial: 320,
  });

  const activeTable = useMemo(
    () => tables.find((t) => t.name === activeName) ?? null,
    [tables, activeName],
  );

  // Auto-dismiss toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ---------- Upload ----------
  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const res = await api.upload(file);
      setDbId(res.dbId);
      setDatabaseName(file.name);
      setTables(res.tables);
      setActiveName(null);
      setQuery('');
      setPage(1);
      setToast({ message: 'Base ouverte en lecture seule.', tone: 'success' });

      // Bonus: ask Llama to refine the heuristic labels (one batch call,
      // cached in localStorage by schema hash). Best-effort — silently keeps
      // the heuristic labels on failure, never blocks the UI.
      void refineLabelsInBackground(res.dbId, res.tables);

      // Build (or restore from cache) the global schema context: domain,
      // summary, per-table purpose. The assistant uses it on every question
      // to reason about the database as a whole, not just the active table.
      void buildContextInBackground(res.dbId, res.tables);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Impossible de lire le fichier.');
    } finally {
      setUploading(false);
    }
  };

  const buildContextInBackground = async (
    dbId: string,
    initialTables: TableInfo[],
  ) => {
    const hash = schemaHash(initialTables);
    const key = `dvl.context.${hash}`;
    try {
      const cached = window.localStorage.getItem(key);
      if (cached) {
        const context = JSON.parse(cached);
        await api.restoreContext(dbId, context);
        return;
      }
    } catch {
      // ignore cache errors
    }
    try {
      const { context } = await api.buildContext(dbId);
      try {
        window.localStorage.setItem(key, JSON.stringify(context));
      } catch {
        // ignore storage errors
      }
    } catch {
      // context is optional — assistant falls back to heuristic understanding
    }
  };

  const refineLabelsInBackground = async (
    dbId: string,
    initialTables: TableInfo[],
  ) => {
    const hash = schemaHash(initialTables);
    try {
      const cached = window.localStorage.getItem(`dvl.labels.${hash}`);
      if (cached) {
        const refined: TableInfo[] = JSON.parse(cached);
        setTables(refined);
        return;
      }
    } catch {
      // ignore cache errors
    }
    try {
      const { tables: refined } = await api.refineLabels(dbId);
      setTables(refined);
      try {
        window.localStorage.setItem(`dvl.labels.${hash}`, JSON.stringify(refined));
      } catch {
        // ignore storage errors
      }
    } catch {
      // refinement is optional — heuristic labels stay in place
    }
  };

  // ---------- Rows fetching ----------
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dbId || !activeName) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => {
        void loadRows(dbId, activeName, query, page);
      },
      query ? 200 : 0,
    );

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbId, activeName, query, page]);

  const loadRows = async (dbId: string, table: string, q: string, page: number) => {
    setLoadingRows(true);
    setRowsError(null);
    try {
      const payload = await api.fetchTable(dbId, table, {
        q,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setRowsPayload(payload);
    } catch (err) {
      setRowsError(err instanceof Error ? err.message : 'Impossible de lire les données.');
      setRowsPayload(null);
    } finally {
      setLoadingRows(false);
    }
  };

  // ---------- Export ----------
  const handleExportCsv = async () => {
    if (!dbId || !activeTable) return;
    try {
      const all = await api.fetchTable(dbId, activeTable.name, {
        q: query,
        limit: MAX_EXPORT_ROWS,
        offset: 0,
      });
      const exporter = new CsvExporter();
      const blob = exporter.build(activeTable.columns, all.rows);
      exporter.download(CsvExporter.filename(activeTable.label), blob);
      setToast({ message: 'Fichier CSV téléchargé.', tone: 'success' });
    } catch {
      setToast({ message: 'Export CSV impossible pour le moment.', tone: 'info' });
    }
  };

  const handleExportPdf = async () => {
    if (!dbId || !activeTable) return;
    try {
      const all = await api.fetchTable(dbId, activeTable.name, {
        q: query,
        limit: MAX_EXPORT_ROWS,
        offset: 0,
      });
      const exporter = new PdfExporter();
      const blob = exporter.build(
        activeTable.label,
        activeTable.columns,
        all.rows,
        query || undefined,
      );
      exporter.download(PdfExporter.filename(activeTable.label), blob);
      setToast({ message: 'Document PDF téléchargé.', tone: 'success' });
    } catch {
      setToast({ message: 'Export PDF impossible pour le moment.', tone: 'info' });
    }
  };

  // ---------- Dynamic assistant suggestions ----------
  const assistantSuggestions = useMemo(
    () => buildAssistantSuggestions(activeTable),
    [activeTable],
  );

  // ---------- Derived ----------
  const totalRows = rowsPayload?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows: Record<string, CellValue>[] = rowsPayload?.rows ?? [];

  // ---------- Render: state A — no database ----------
  if (!dbId) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <TopBar
          onUpload={handleUpload}
          uploading={uploading}
          onShowGuide={() => setShowGuide(true)}
        />
        <UploadDropzone onFile={handleUpload} uploading={uploading} error={uploadError} />
        <Onboarding open={showGuide} onClose={closeGuide} />
      </div>
    );
  }

  // ---------- Render: state B — database loaded ----------
  return (
    <div className="h-screen flex flex-col bg-white">
      <TopBar
        onUpload={handleUpload}
        uploading={uploading}
        databaseName={databaseName}
        onShowGuide={() => setShowGuide(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          tables={tables}
          activeName={activeName}
          onSelect={(n) => {
            setActiveName(n);
            setQuery('');
            setPage(1);
          }}
          width={sidebarResize.width}
        />
        <ResizeHandle
          side="left"
          onPointerDown={sidebarResize.startResize}
          ariaLabel="Redimensionner la liste des tables"
        />

        <main className="flex-1 flex flex-col bg-white overflow-hidden">
          {tables.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-500 gap-2">
              <p>Aucune table exploitable trouvée dans cette base.</p>
              <button
                onClick={() => setDbId(null)}
                className="text-accent-700 underline"
              >
                Choisir une autre base
              </button>
            </div>
          ) : !activeTable ? (
            <div className="flex-1 flex items-center justify-center px-6 py-10">
              <div className="max-w-2xl w-full">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                    Bienvenue dans votre base
                  </h2>
                  <p className="text-sm text-slate-600 mt-2">
                    Voici comment vous repérer en quelques secondes.
                  </p>
                </div>
                <ul className="space-y-3">
                  <li className="flex gap-3 items-start rounded-lg border border-slate-200 bg-white p-4">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-accent-50 text-accent-700 text-sm font-semibold flex items-center justify-center">
                      1
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        À gauche — vos tables
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        Cliquez sur le nom d’une table pour afficher ses lignes
                        ici, au centre.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start rounded-lg border border-slate-200 bg-white p-4">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-accent-50 text-accent-700 text-sm font-semibold flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Au-dessus du tableau — recherche et exports
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        Une barre de recherche pour filtrer les lignes, et deux
                        boutons pour exporter en PDF ou en CSV.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start rounded-lg border border-slate-200 bg-white p-4">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-accent-50 text-accent-700 text-sm font-semibold flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        À droite — l’assistant
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        Posez vos questions en français — par exemple
                        « Combien de clients ? » ou « Résume cette table ».
                      </p>
                    </div>
                  </li>
                </ul>
                <p className="text-xs text-slate-500 text-center mt-6">
                  Vos données restent sur votre ordinateur. La base est en
                  lecture seule, vous ne pouvez rien casser.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 pt-5 pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                      {activeTable.label}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 tabular-nums">
                      {activeTable.rowCount.toLocaleString('fr-FR')}{' '}
                      {activeTable.rowCount > 1 ? 'lignes' : 'ligne'}
                      {' · '}
                      {activeTable.columns.length}{' '}
                      {activeTable.columns.length > 1 ? 'colonnes' : 'colonne'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SearchBar
                      value={query}
                      onChange={(q) => {
                        setQuery(q);
                        setPage(1);
                      }}
                      placeholder={`Rechercher dans ${activeTable.label.toLowerCase()}…`}
                    />
                    <button
                      onClick={handleExportPdf}
                      disabled={pageRows.length === 0}
                      className="text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        pageRows.length === 0
                          ? 'Aucune donnée à exporter pour le moment.'
                          : 'Exporter les lignes affichées en PDF (prêt à imprimer).'
                      }
                    >
                      Exporter en PDF
                    </button>
                    <button
                      onClick={handleExportCsv}
                      disabled={pageRows.length === 0}
                      className="text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        pageRows.length === 0
                          ? 'Aucune donnée à exporter pour le moment.'
                          : 'Exporter les lignes affichées en CSV.'
                      }
                    >
                      Exporter en CSV
                    </button>
                  </div>
                </div>
              </div>

              <TableSummary table={activeTable} sampleRows={pageRows} />

              {rowsError ? (
                <div className="flex-1 flex items-center justify-center text-rose-700 text-sm bg-white px-6 text-center">
                  {rowsError}
                </div>
              ) : (
                <TableView
                  table={activeTable}
                  rows={pageRows}
                  query={query}
                  loading={loadingRows}
                />
              )}
            </>
          )}
        </main>

        <ResizeHandle
          side="right"
          onPointerDown={assistantResize.startResize}
          ariaLabel="Redimensionner le panneau assistant"
        />
        <AssistantChat
          dbId={dbId}
          currentTable={activeName}
          examples={assistantSuggestions.length > 0 ? assistantSuggestions : STARTER_QUESTIONS}
          placeholder="Posez votre question…"
          width={assistantResize.width}
        />
      </div>

      <Footer
        page={safePage}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        shownCount={pageRows.length}
        totalCount={totalRows}
      />

      {toast && (
        <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}

      <Onboarding open={showGuide} onClose={closeGuide} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cheap, stable hash of the *raw* schema (names + types). Used as the cache
// key for refined labels, so two databases with the same shape share the cache.
// ---------------------------------------------------------------------------
function schemaHash(tables: TableInfo[]): string {
  const fingerprint = tables
    .map((t) => `${t.name}(${t.columns.map((c) => `${c.key}:${c.type}`).join(',')})`)
    .sort()
    .join('|');
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < fingerprint.length; i++) {
    h ^= fingerprint.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

// ---------------------------------------------------------------------------
// Heuristic, schema-driven question suggestions for the assistant.
// ---------------------------------------------------------------------------
function buildAssistantSuggestions(table: TableInfo | null): string[] {
  if (!table) return [];
  const out: string[] = ['Combien de lignes contient cette table ?', 'Résume cette table'];

  const hasDate = table.columns.some(
    (c) => c.type === 'date' || /(_at|_on|date|year)$/i.test(c.key),
  );
  const hasPaid = table.columns.some(
    (c) => /pay|paid|impay|due|status|statut/i.test(c.key),
  );

  if (hasPaid) out.push('Quels éléments ne sont pas réglés ?');
  else if (hasDate) out.push('Combien d’éléments ce mois-ci ?');
  else out.push('Montre les derniers enregistrements');

  return out.slice(0, 3);
}
