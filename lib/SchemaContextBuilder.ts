import { Database } from './Database';
import { LlmClient } from './LlmClient';
import { SqlGuard } from './SqlGuard';
import type { CellValue, SchemaContext, TableInfo } from './types';

/**
 * Computes a global, schema-driven understanding of an uploaded database.
 * One batch LLM call: domain inference + per-table purpose. The result is
 * cached on the DatabaseRegistry entry and reused by every assistant call,
 * so the LLMs always reason against the same shared mental model.
 *
 * Mock-first: if Ollama is unreachable, returns a heuristic context built
 * from labels alone (still useful, never blocks the app).
 */
export class SchemaContextBuilder {
  constructor(private readonly llm: LlmClient = new LlmClient()) {}

  async build(tables: TableInfo[], db: Database): Promise<SchemaContext> {
    if (tables.length === 0) {
      return { domain: 'Base vide', summary: 'Aucune table exploitable.', tables: {} };
    }

    const samples = collectSamples(tables, db);
    const heuristic = heuristicContext(tables);

    if (!(await this.llm.isAlive())) {
      console.log('[context] Ollama unreachable → heuristic context only');
      return heuristic;
    }

    const model = process.env.OLLAMA_SQL_MODEL ?? 'qwen2.5-coder:7b';
    const prompt = buildPrompt(tables, samples);
    console.log(
      `[context] building (${model}) — ${tables.length} table(s), ${
        Object.values(samples).reduce((n, s) => n + s.length, 0)
      } sample row(s)`,
    );

    let raw: string;
    try {
      raw = await this.llm.generate(model, prompt, {
        json: true,
        temperature: 0.2,
        timeoutMs: 60_000,
      });
    } catch (err) {
      console.warn(
        `[context] LLM call failed → heuristic only: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return heuristic;
    }

    return parseContext(raw, tables, heuristic);
  }
}

// ---------------------------------------------------------------------------

function collectSamples(
  tables: TableInfo[],
  db: Database,
): Record<string, Record<string, CellValue>[]> {
  const out: Record<string, Record<string, CellValue>[]> = {};
  for (const t of tables) {
    try {
      const quoted = SqlGuard.quoteIdent(t.name);
      out[t.name] = db.all<Record<string, CellValue>>(
        `SELECT * FROM ${quoted} LIMIT 3`,
      );
    } catch {
      out[t.name] = [];
    }
  }
  return out;
}

function heuristicContext(tables: TableInfo[]): SchemaContext {
  const tableMap: Record<string, string> = {};
  for (const t of tables) {
    tableMap[t.name] =
      `Table « ${t.label} » contenant ${t.rowCount} ligne(s) et ${t.columns.length} colonne(s).`;
  }
  return {
    domain: 'Base de données',
    summary: `Cette base contient ${tables.length} table(s) : ${tables
      .map((t) => t.label)
      .join(', ')}.`,
    tables: tableMap,
  };
}

function buildPrompt(
  tables: TableInfo[],
  samples: Record<string, Record<string, CellValue>[]>,
): string {
  const digest = tables.map((t) => ({
    name: t.name,
    label: t.label,
    rowCount: t.rowCount,
    columns: t.columns.map((c) => ({ name: c.key, label: c.label, type: c.type })),
    sample: samples[t.name] ?? [],
  }));

  return [
    "Tu analyses une base SQLite pour comprendre globalement de quoi il s'agit.",
    'Sortie : UN objet JSON valide, en français, pour aider un assistant à répondre par la suite.',
    '',
    'RÈGLES :',
    "1. Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour.",
    "2. Reste générique : ne fais aucune supposition métier qui ne soit pas appuyée par les noms et les données.",
    "3. `domain` : 2 à 6 mots décrivant le métier le plus probable (ex. « Boutique e-commerce », « Association loi 1901 », « Garage automobile », « Gestion administrative », « Bibliothèque »).",
    "4. `summary` : 1 à 3 phrases résumant à quoi sert cette base.",
    "5. `tables` : pour CHAQUE nom de table fourni, UNE phrase courte décrivant ce que la table contient et son rôle.",
    "6. N'invente aucune table, aucune colonne. Utilise EXACTEMENT les noms fournis.",
    '',
    'STRUCTURE DE SORTIE (utilise EXACTEMENT ces clés) :',
    '{',
    '  "domain": "<court libellé métier>",',
    '  "summary": "<1 à 3 phrases>",',
    '  "tables": { "<nom_table_brut>": "<rôle de cette table>" }',
    '}',
    '',
    `SCHÉMA + ÉCHANTILLONS : ${JSON.stringify(digest)}`,
  ].join('\n');
}

function parseContext(
  raw: string,
  tables: TableInfo[],
  fallback: SchemaContext,
): SchemaContext {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');

  let parsed: Partial<SchemaContext>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn('[context] LLM returned invalid JSON → heuristic only');
    return fallback;
  }

  const validTables = new Set(tables.map((t) => t.name));
  const tableMap: Record<string, string> = { ...fallback.tables };
  if (parsed.tables && typeof parsed.tables === 'object') {
    for (const [k, v] of Object.entries(parsed.tables)) {
      if (validTables.has(k) && typeof v === 'string' && v.trim()) {
        tableMap[k] = v.trim().slice(0, 240);
      }
    }
  }

  return {
    domain: clampString(parsed.domain, fallback.domain, 60),
    summary: clampString(parsed.summary, fallback.summary, 360),
    tables: tableMap,
  };
}

function clampString(v: unknown, fallback: string, max: number): string {
  if (typeof v !== 'string') return fallback;
  const s = v.trim();
  if (!s) return fallback;
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
