'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type {
  AssistantResponse,
  CellValue,
  ChatMessage,
  Column,
} from '@/lib/types';

interface AssistantChatProps {
  dbId: string | null;
  currentTable: string | null;
  examples: string[];
  placeholder: string;
  width: number;
}

interface AssistantTurn extends ChatMessage {
  rows?: Record<string, CellValue>[];
  columns?: Column[];
  mock?: boolean;
}

export function AssistantChat({
  dbId,
  currentTable,
  examples,
  placeholder,
  width,
}: AssistantChatProps) {
  const [messages, setMessages] = useState<AssistantTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(examples);
  const [mockMode, setMockMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveSuggestions(examples);
  }, [examples.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');

    if (!dbId) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'Importez d’abord une base pour que je puisse répondre.',
        },
      ]);
      return;
    }

    setLoading(true);
    try {
      // Send the last few exchanges so the LLMs can resolve follow-ups
      // ("et pour mars ?", "lesquels ne sont pas réglés ?", …).
      const recentHistory: ChatMessage[] = messages
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));
      const res: AssistantResponse = await api.ask(
        dbId,
        q,
        currentTable ?? undefined,
        recentHistory,
      );
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: res.answer,
          rows: res.rows,
          columns: res.columns,
          mock: res.mock,
        },
      ]);
      if (res.suggestions?.length) setActiveSuggestions(res.suggestions);
      setMockMode(Boolean(res.mock));
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text:
            err instanceof Error
              ? err.message
              : 'Désolé, je n’ai pas pu répondre. Réessayez.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      style={{ width: `${width}px` }}
      className="shrink-0 border-l border-slate-200 bg-white flex flex-col min-w-0 overflow-hidden"
    >
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Assistant</h2>
          {mockMode && (
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              Mode démo
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Posez une question sur les données importées.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500 leading-relaxed">
            Aucune question pour le moment. Utilisez une suggestion ci-dessous
            pour commencer.
          </p>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} turn={m} />
        ))}
        {loading && (
          <p className="text-sm text-slate-400 italic">L’assistant réfléchit…</p>
        )}
      </div>

      <div className="px-4 pb-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-[0.08em] text-slate-400 font-semibold">
          Suggestions
        </div>
        <div className="flex flex-wrap gap-1.5">
          {activeSuggestions.slice(0, 3).map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              disabled={loading}
              className="text-xs text-slate-700 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 hover:border-accent-500 hover:bg-white transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="border-t border-slate-100 p-3 bg-white"
      >
        <div className="flex gap-2 min-w-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1 min-w-0 h-10 px-3 rounded-md border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100 disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-10 px-3 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Envoyer
          </button>
        </div>
      </form>
    </aside>
  );
}

function Bubble({ turn }: { turn: AssistantTurn }) {
  const isUser = turn.role === 'user';
  return (
    <div className="space-y-1.5">
      <div
        className={[
          'rounded-md px-3 py-2 text-sm leading-relaxed max-w-[92%]',
          isUser
            ? 'bg-slate-900 text-white ml-auto'
            : 'bg-slate-50 text-slate-800 border border-slate-200',
        ].join(' ')}
      >
        {turn.text}
      </div>
      {turn.rows && turn.rows.length > 0 && turn.columns && (
        <MiniTable rows={turn.rows} columns={turn.columns} />
      )}
    </div>
  );
}

function MiniTable({
  rows,
  columns,
}: {
  rows: Record<string, CellValue>[];
  columns: Column[];
}) {
  const shownRows = rows.slice(0, 20);
  const shownCols = columns;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const html = buildHtml(columns, rows);
    const tsv = buildTsv(columns, rows);
    try {
      // Rich table for Gmail / Outlook / Word + TSV fallback for Sheets / Excel.
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([tsv], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(tsv);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API blocked; silently ignore.
    }
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-2.5 py-1 bg-slate-50 border-b border-slate-200">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Résultat
        </span>
        <button
          onClick={handleCopy}
          className="text-[11px] text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300 bg-white transition-colors"
          title="Copier les lignes (collable dans Excel ou un courrier)."
        >
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50">
            {shownCols.map((c) => (
              <th
                key={c.key}
                className="text-left font-medium text-slate-600 px-2.5 py-1.5 border-b border-slate-200"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shownRows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {shownCols.map((c) => (
                <td
                  key={c.key}
                  className="px-2.5 py-1.5 border-b border-slate-100 text-slate-800 whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis"
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
      {rows.length > shownRows.length && (
        <div className="px-2.5 py-1 text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">
          Aperçu — {shownRows.length} / {rows.length} lignes
        </div>
      )}
    </div>
  );
}

function buildTsv(columns: Column[], rows: Record<string, CellValue>[]): string {
  const header = columns.map((c) => c.label).join('\t');
  const body = rows
    .map((row) =>
      columns.map((c) => sanitizeForClipboard(row[c.key], c.type)).join('\t'),
    )
    .join('\n');
  return `${header}\n${body}`;
}

/**
 * HTML table preserved by Gmail / Outlook / Word when pasted.
 * Inline styles only (most mail clients strip <style>).
 */
function buildHtml(columns: Column[], rows: Record<string, CellValue>[]): string {
  const tableStyle =
    'border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0f172a;';
  const thStyle =
    'border:1px solid #cbd5e1;background:#f1f5f9;padding:6px 10px;text-align:left;font-weight:600;';
  const tdStyle = 'border:1px solid #e2e8f0;padding:6px 10px;vertical-align:top;';

  const header = `<tr>${columns
    .map((c) => `<th style="${thStyle}">${escapeHtml(c.label)}</th>`)
    .join('')}</tr>`;

  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (c) =>
              `<td style="${tdStyle}">${escapeHtml(
                sanitizeForClipboard(row[c.key], c.type),
              )}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');

  return `<table style="${tableStyle}"><thead>${header}</thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeForClipboard(value: CellValue, type: Column['type']): string {
  if (value === null || value === undefined || value === '') return '';
  if (type === 'bool') return value ? 'Oui' : 'Non';
  if (type === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n)
      ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
      : String(value);
  }
  // Strip tabs/newlines so cells stay aligned in Sheets/Excel.
  return String(value).replace(/[\t\r\n]+/g, ' ');
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
