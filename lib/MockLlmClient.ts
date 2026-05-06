import type { LlmClientLike, LlmGenerateOptions } from './LlmClient';
import type { Schema } from './types';
import { SqlGuard } from './SqlGuard';

/**
 * Mock implementation. Recognises a few French keywords and returns a
 * minimal JSON payload compatible with the SQL prompt contract:
 *
 *   { "sql": "SELECT ...", "displayHint": "number|table|clarify",
 *     "needsClarification": false, "reason": "..." }
 *
 * The PromptBuilder embeds the schema into the prompt; we re-parse the schema
 * out of the prompt to stay generic — see assistant.ts for the real path.
 *
 * For clarity, this client is built **with the schema injected directly**,
 * which makes it deterministic and zero-cost.
 */
export class MockLlmClient implements LlmClientLike {
  constructor(private readonly schema: Schema | null = null) {}

  async generate(_model: string, prompt: string, _opts?: LlmGenerateOptions): Promise<string> {
    // The Assistant orchestrator passes the original question on the LAST line of the prompt.
    const question = extractQuestion(prompt).toLowerCase();
    const currentTable = extractCurrentTable(prompt);
    const tables = this.schema?.tables ?? [];

    if (!question || tables.length === 0) {
      return JSON.stringify({ needsClarification: true, sql: '', reason: 'empty' });
    }

    const target = pickTable(question, tables, currentTable);
    if (!target) {
      return JSON.stringify({
        needsClarification: true,
        sql: '',
        reason: 'no-table',
      });
    }

    const quoted = SqlGuard.quoteIdent(target.name);

    // « qui n'a pas payé » → check this BEFORE city detection (which would match "a ").
    if (/(pas pay|impay|unpaid|not paid)/.test(question)) {
      // Prefer an exact boolean-ish flag (`paid`, `is_paid`) over date columns like `payment_date`.
      const paidCol =
        target.columns.find((c) => /^(paid|is_paid|payed|impaye)$/i.test(c.key)) ??
        target.columns.find(
          (c) => (c.type === 'bool' || c.type === 'number') && /pay|paid/i.test(c.key),
        );
      if (paidCol) {
        return JSON.stringify({
          sql: `SELECT * FROM ${quoted} WHERE ${SqlGuard.quoteIdent(paidCol.key)} = 0 LIMIT 100`,
          displayHint: 'table',
          needsClarification: false,
        });
      }
    }

    // « combien / how many » → COUNT(*)
    if (/(combien|how many|nombre de)/.test(question)) {
      return JSON.stringify({
        sql: `SELECT COUNT(*) AS n FROM ${quoted}`,
        displayHint: 'number',
        needsClarification: false,
      });
    }

    // city-style search: "à Lyon", "de Paris", "in London"
    const cityMatch = question.match(/(?:à|a |de |in )\s*([a-zàâçéèêëîïôûùüÿñæœ\-]+)/i);
    if (cityMatch) {
      const term = cityMatch[1];
      const textCols = target.columns.filter((c) => c.type === 'text');
      if (textCols.length > 0) {
        const where = textCols
          .slice(0, 6)
          .map((c) => `CAST(${SqlGuard.quoteIdent(c.key)} AS TEXT) LIKE '%${escape(term)}%'`)
          .join(' OR ');
        return JSON.stringify({
          sql: `SELECT * FROM ${quoted} WHERE ${where} LIMIT 100`,
          displayHint: 'table',
          needsClarification: false,
        });
      }
    }

    // « liste / montre / show / list » → SELECT * LIMIT
    if (/(liste|montre|show|list|affiche)/.test(question)) {
      return JSON.stringify({
        sql: `SELECT * FROM ${quoted} LIMIT 50`,
        displayHint: 'table',
        needsClarification: false,
      });
    }

    // Default: COUNT(*) — never crash.
    return JSON.stringify({
      sql: `SELECT COUNT(*) AS n FROM ${quoted}`,
      displayHint: 'number',
      needsClarification: false,
    });
  }
}

function extractQuestion(prompt: string): string {
  const lines = prompt.split('\n').map((l) => l.trim()).filter(Boolean);
  // PromptBuilder ends with: QUESTION: "..."
  const last = lines[lines.length - 1] ?? '';
  const m = last.match(/^QUESTION\s*:\s*["“]?(.+?)["”]?$/i);
  return m ? m[1] : last;
}

function pickTable(
  question: string,
  tables: Schema['tables'],
  currentTable: string | null,
): Schema['tables'][number] | null {
  const norm = (s: string) => normalize(s);
  const q = norm(question);

  // 1. Explicit table mention by name or label.
  for (const t of tables) {
    if (q.includes(norm(t.label)) || q.includes(norm(t.name))) return t;
  }
  // 2. Singular / plural stem.
  for (const t of tables) {
    const stem = norm(t.label).replace(/s$/, '');
    if (stem.length >= 4 && q.includes(stem)) return t;
  }
  // 3. Fall back to the table the user is currently viewing.
  if (currentTable) {
    const hit = tables.find((t) => t.name === currentTable);
    if (hit) return hit;
  }
  return tables[0] ?? null;
}

/**
 * The PromptBuilder embeds the current table name inside a French sentence:
 *   « privilégie la table « <name> » ».
 * We pull it out so the mock can stay context-aware without a parsed schema.
 */
function extractCurrentTable(prompt: string): string | null {
  const m = prompt.match(/privilégie la table\s+«\s*([^»]+?)\s*»/i);
  return m ? m[1].trim() : null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function escape(s: string): string {
  return s.replace(/'/g, "''");
}
