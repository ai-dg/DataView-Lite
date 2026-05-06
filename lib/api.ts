import type {
  AssistantResponse,
  ChatMessage,
  RowsPayload,
  SchemaContext,
  TableInfo,
} from './types';

export interface UploadResponse {
  dbId: string;
  tables: TableInfo[];
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let message = 'Une erreur est survenue.';
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    // ignore parse errors
  }
  throw new Error(message);
}

export const api = {
  async upload(file: File): Promise<UploadResponse> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/database/upload', { method: 'POST', body: form });
    return jsonOrThrow<UploadResponse>(res);
  },

  async fetchTable(
    dbId: string,
    table: string,
    opts: { q?: string; limit?: number; offset?: number } = {},
  ): Promise<RowsPayload> {
    const params = new URLSearchParams({ dbId, table });
    if (opts.q) params.set('q', opts.q);
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.offset !== undefined) params.set('offset', String(opts.offset));
    const res = await fetch(`/api/database/table?${params.toString()}`);
    return jsonOrThrow<RowsPayload>(res);
  },

  async ask(
    dbId: string,
    question: string,
    currentTable?: string,
    history?: ChatMessage[],
  ): Promise<AssistantResponse> {
    const res = await fetch('/api/assistant/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbId, question, currentTable, history }),
    });
    return jsonOrThrow<AssistantResponse>(res);
  },

  async refineLabels(
    dbId: string,
  ): Promise<{ tables: TableInfo[] }> {
    const res = await fetch('/api/database/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbId }),
    });
    return jsonOrThrow<{ tables: TableInfo[] }>(res);
  },

  async buildContext(dbId: string): Promise<{ context: SchemaContext }> {
    const res = await fetch('/api/database/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbId }),
    });
    return jsonOrThrow<{ context: SchemaContext }>(res);
  },

  async restoreContext(
    dbId: string,
    context: SchemaContext,
  ): Promise<{ context: SchemaContext }> {
    // Re-publish a cached context to the server registry so the assistant
    // benefits from it without recomputing.
    const res = await fetch('/api/database/context', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbId, context }),
    });
    return jsonOrThrow<{ context: SchemaContext }>(res);
  },
};
