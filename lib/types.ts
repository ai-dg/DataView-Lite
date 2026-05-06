export type CellValue = string | number | boolean | null;

export type ColumnType = 'text' | 'number' | 'date' | 'bool';

export interface Column {
  /** Original column name from the database. */
  key: string;
  /** Humanized French label shown in the UI. */
  label: string;
  type: ColumnType;
}

export interface TableInfo {
  /** Original table name from the database. */
  name: string;
  /** Humanized French label shown in the UI. */
  label: string;
  rowCount: number;
  columns: Column[];
}

export interface Schema {
  dbId: string;
  tables: TableInfo[];
}

export interface RowsPayload {
  rows: Record<string, CellValue>[];
  total: number;
  limit: number;
  offset: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export type AssistantResultType =
  | 'text'
  | 'number'
  | 'table'
  | 'clarification'
  | 'error';

export interface AssistantQuery {
  dbId: string;
  question: string;
  currentTable?: string;
  /** Recent chat turns to give the LLMs context for follow-up questions. */
  history?: ChatMessage[];
}

export interface AssistantResponse {
  answer: string;
  resultType: AssistantResultType;
  rows: Record<string, CellValue>[];
  columns: Column[];
  suggestions: string[];
  /** Set to true when the response was produced by the mock fallback. */
  mock?: boolean;
}

/** Normalized output of an LLM SQL call. */
export interface SqlGenerationResult {
  sql: string;
  needsClarification: boolean;
  displayHint?: AssistantResultType;
  reason?: string;
}

/**
 * Global understanding of an uploaded database. Computed once, after the
 * schema is introspected, and reused by every subsequent assistant call so
 * the LLMs reason with a stable, shared mental model of the database.
 */
export interface SchemaContext {
  /** Short metier label inferred from the schema (e.g. "Association loi 1901"). */
  domain: string;
  /** 1–3 sentence overview of what the database is about. */
  summary: string;
  /** Per-table one-liner explaining what each table holds. */
  tables: Record<string, string>;
}
