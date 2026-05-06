import { DatabaseRegistry } from './DatabaseRegistry';
import { LlmClient, type LlmClientLike } from './LlmClient';
import { MockLlmClient } from './MockLlmClient';
import { PromptBuilder } from './PromptBuilder';
import { SqlGuard } from './SqlGuard';
import { SqlValidator } from './SqlValidator';
import { Suggester } from './Suggester';
import type {
  AssistantQuery,
  AssistantResponse,
  CellValue,
  Column,
  Schema,
  SchemaContext,
  SqlGenerationResult,
  TableInfo,
} from './types';

type MetaIntent = 'describe' | 'summary';

/**
 * High-level orchestrator: schema → LLM SQL → validate → execute → format.
 * Catches every failure and falls back to mock mode. The app never crashes
 * because the assistant did.
 */
export class Assistant {
  private readonly real: LlmClient;

  constructor(realLlm?: LlmClient) {
    this.real = realLlm ?? new LlmClient();
  }

  // Internal label for meta intents detected by the shortcut.
  // `describe` → describe the table itself, do not show the rows.
  // `summary`  → show a sample of rows + a wrap-up sentence.

  async ask(query: AssistantQuery): Promise<AssistantResponse> {
    const entry = DatabaseRegistry.instance().get(query.dbId);
    const schema: Schema = { dbId: query.dbId, tables: entry.tables };

    if (!query.question.trim()) {
      return this.#empty(schema, query.currentTable);
    }

    const mode = (process.env.LLM_MODE ?? 'auto').toLowerCase();
    const useMock = mode === 'mock' || !(await this.real.isAlive());

    const llm: LlmClientLike = useMock
      ? new MockLlmClient(schema)
      : this.real;

    // Meta-intent shortcut: "c'est quoi cette table ?", "résume", "que contient".
    // Build a deterministic SELECT and remember the intent so we can route
    // Llama to the right kind of phrasing and decide whether to show rows.
    const meta = this.#metaShortcut(query, schema);
    let generation: SqlGenerationResult | null = meta?.generation ?? null;
    const intent: MetaIntent | null = meta?.intent ?? null;

    if (!generation) {
      try {
        generation = await this.#generateSql(llm, schema, query);
      } catch {
        // LLM failure → degrade to mock once, then give up to a clarification.
        generation = await this.#safeGenerate(new MockLlmClient(schema), schema, query);
      }
    }

    if (generation.needsClarification || !generation.sql) {
      return await this.#clarification(query, schema, useMock);
    }

    let safeSql: string;
    try {
      safeSql = SqlValidator.assertSafeSelect(generation.sql);
      this.#assertReferencesKnownTables(safeSql, schema);
      console.log(`[assistant] sql validated → ${safeSql}`);
    } catch {
      return {
        answer:
          'Je n’ai pas réussi à formuler une réponse fiable. Reformulez votre question ou utilisez la recherche.',
        resultType: 'error',
        rows: [],
        columns: [],
        suggestions: Suggester.forSchema(schema, query.currentTable),
        mock: useMock,
      };
    }

    let rows: Record<string, CellValue>[] = [];
    try {
      rows = entry.db.all<Record<string, CellValue>>(safeSql);
      console.log(`[assistant] sqlite executed → ${rows.length} row(s)`);
    } catch {
      return {
        answer:
          'Je n’ai pas pu exécuter cette demande sur la base. Essayez de reformuler.',
        resultType: 'error',
        rows: [],
        columns: [],
        suggestions: Suggester.forSchema(schema, query.currentTable),
        mock: useMock,
      };
    }

    // Second LLM call: ALWAYS ask the chat model (llama3.2:3b) to phrase the
    // result as one warm French sentence — even on empty results, so the user
    // gets a friendlier message than the template. Skipped only in mock mode.
    // Falls back to a template if Llama fails, visibly so in the server log.
    let chatAnswer: string | null = null;
    if (!useMock) {
      try {
        chatAnswer = await this.#explain(query, rows, intent, meta?.table);
        console.log(
          `[assistant] chat ok → "${chatAnswer.slice(0, 80)}${
            chatAnswer.length > 80 ? '…' : ''
          }"`,
        );
      } catch (err) {
        console.warn(
          `[assistant] chat (llama) failed, falling back to template: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        chatAnswer = null;
      }
    } else {
      console.log('[assistant] mock mode → no chat LLM call');
    }

    return this.#format(
      rows,
      schema,
      query,
      useMock,
      generation.displayHint,
      chatAnswer,
      intent,
    );
  }

  /**
   * Recognises meta-questions about a table itself ("c'est quoi cette table",
   * "résume", "que contient"). Returns a deterministic SELECT and the intent
   * so the rest of the pipeline knows whether to display the rows or only a
   * descriptive sentence.
   */
  #metaShortcut(
    query: AssistantQuery,
    schema: Schema,
  ): { generation: SqlGenerationResult; intent: MetaIntent; table: string } | null {
    const q = query.question.toLowerCase();

    // Pure-description intents: the user wants to know what the table IS,
    // not see its rows. Match before the broader "summary" net.
    // Apostrophes are optional (mobile keyboards often drop them).
    const isDescribe =
      /\bc['’\s]?est\s+quoi\b|\bqu['’\s]?est[-\s]?ce\s+que\b|\b[àa]\s+quoi\s+sert\b|\bd[ée]cris(?:[-\s]moi)?\b|\bexplique(?:[-\s]moi)?\b|\bde\s+quoi\s+s['’\s]?agit[-\s]il\b|\bcontenu\s+de\s+(la\s+)?table\b/.test(
        q,
      );

    const isSummary =
      !isDescribe &&
      /\br[ée]sume(?:r|z)?\b|\br[ée]sum[ée]\b|\bque\s+contient\b|\bsummari[sz]e\b/.test(
        q,
      );

    if (!isDescribe && !isSummary) return null;

    const tableName =
      query.currentTable && schema.tables.find((t) => t.name === query.currentTable)
        ? query.currentTable
        : schema.tables[0]?.name;
    if (!tableName) return null;

    const quoted = SqlGuard.safeTable(
      tableName,
      schema.tables.map((t) => t.name),
    );

    const intent: MetaIntent = isDescribe ? 'describe' : 'summary';
    const limit = intent === 'describe' ? 5 : 20;
    return {
      generation: {
        sql: `SELECT * FROM ${quoted} LIMIT ${limit}`,
        needsClarification: false,
        displayHint: 'text',
      },
      intent,
      table: tableName,
    };
  }

  async #explain(
    query: AssistantQuery,
    rows: Record<string, CellValue>[],
    intent: MetaIntent | null = null,
    metaTable: string | null = null,
  ): Promise<string> {
    const entry = DatabaseRegistry.instance().get(query.dbId);
    const tableInfo =
      (intent === 'describe' || intent === 'summary') && metaTable
        ? entry.tables.find((t) => t.name === metaTable) ?? null
        : null;
    const prompt = PromptBuilder.explain(
      query.question,
      rows,
      query.history,
      20,
      intent,
      tableInfo,
      entry.context ?? null,
    );
    const model = process.env.OLLAMA_CHAT_MODEL ?? 'llama3.2:3b';
    console.log(
      `[assistant] chat (${model}) — explaining ${rows.length} row(s)${
        intent ? ` [intent=${intent}]` : ''
      }`,
    );
    // Higher temperature for descriptive intents → more varied wording.
    const temperature =
      intent === 'describe' || intent === 'summary' ? 0.75 : 0.3;
    const raw = await this.real.generate(model, prompt, { temperature });
    // Strip leading/trailing quotes, keep all non-empty lines (some intents
    // expect 2–3 sentences and Llama tends to put each on its own line).
    const cleaned = raw
      .trim()
      .replace(/^["'`«»]+|["'`«»]+$/g, '')
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ');
    return cleaned || raw;
  }

  // ---------------------------------------------------------------------------

  async #generateSql(
    llm: LlmClientLike,
    schema: Schema,
    query: AssistantQuery,
  ): Promise<SqlGenerationResult> {
    const entry = DatabaseRegistry.instance().get(query.dbId);
    const prompt = PromptBuilder.sql(
      schema,
      query.question,
      query.currentTable,
      query.history,
      entry.context ?? null,
    );
    const model = process.env.OLLAMA_SQL_MODEL ?? 'qwen2.5-coder:7b';
    console.log(
      `[assistant] sql (${model}) — generating from "${query.question.slice(0, 80)}${
        query.question.length > 80 ? '…' : ''
      }"`,
    );
    const raw = await llm.generate(model, prompt, { json: true, temperature: 0.1 });
    const parsed = this.#parse(raw);
    if (parsed.needsClarification) {
      console.log(
        `[assistant] sql parsed → needsClarification (${parsed.reason ?? 'no reason'})`,
      );
    } else {
      console.log(
        `[assistant] sql parsed → "${parsed.sql.slice(0, 120)}${
          parsed.sql.length > 120 ? '…' : ''
        }"  (hint=${parsed.displayHint ?? '?'})`,
      );
    }
    return parsed;
  }

  async #safeGenerate(
    llm: LlmClientLike,
    schema: Schema,
    query: AssistantQuery,
  ): Promise<SqlGenerationResult> {
    try {
      return await this.#generateSql(llm, schema, query);
    } catch {
      return { sql: '', needsClarification: true, reason: 'fallback-failure' };
    }
  }

  #parse(raw: string): SqlGenerationResult {
    if (!raw) return { sql: '', needsClarification: true, reason: 'empty' };
    // Strip code fences just in case.
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    try {
      const obj = JSON.parse(cleaned) as Partial<SqlGenerationResult>;
      return {
        sql: typeof obj.sql === 'string' ? obj.sql : '',
        needsClarification: Boolean(obj.needsClarification),
        displayHint: obj.displayHint,
        reason: obj.reason,
      };
    } catch {
      return { sql: '', needsClarification: true, reason: 'parse-error' };
    }
  }

  #assertReferencesKnownTables(sql: string, schema: Schema): void {
    // Cheap check: every word that looks like an unknown identifier referenced
    // after FROM/JOIN must be a known table. We don't run a full SQL parser.
    const allowed = schema.tables.map((t) => t.name.toLowerCase());
    const re = /\b(from|join)\s+["']?([a-zA-Z_][\w$]*)["']?/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      if (!allowed.includes(m[2].toLowerCase())) {
        // Re-use SqlGuard error for consistency
        SqlGuard.safeTable(m[2], schema.tables.map((t) => t.name));
      }
    }
  }

  #tableInfo(dbId: string, tableName: string) {
    const entry = DatabaseRegistry.instance().get(dbId);
    return entry.tables.find((t) => t.name === tableName) ?? null;
  }

  #format(
    rows: Record<string, CellValue>[],
    schema: Schema,
    query: AssistantQuery,
    mock: boolean,
    hint?: string,
    chatAnswer?: string | null,
    intent: MetaIntent | null = null,
  ): AssistantResponse {
    // « C'est quoi cette table ? » → answer with text only, no row table.
    if (intent === 'describe') {
      return {
        answer:
          chatAnswer ??
          'Cette table contient des enregistrements liés à votre base.',
        resultType: 'text',
        rows: [],
        columns: [],
        suggestions: Suggester.forSchema(schema, query.currentTable),
        mock,
      };
    }

    const suggestions = Suggester.forSchema(schema, query.currentTable);

    if (rows.length === 0) {
      return {
        answer:
          chatAnswer ?? 'Je n’ai trouvé aucun résultat pour cette question.',
        resultType: 'text',
        rows: [],
        columns: [],
        suggestions,
        mock,
      };
    }

    // Single row, single value → number sentence
    if (rows.length === 1) {
      const onlyRow = rows[0];
      const keys = Object.keys(onlyRow);
      if (keys.length === 1) {
        const value = onlyRow[keys[0]];
        const sentence = chatAnswer ?? sentenceForScalar(value, query, schema);
        return {
          answer: sentence,
          resultType: 'number',
          rows: [],
          columns: [],
          suggestions,
          mock,
        };
      }
    }

    // Otherwise: tabular result
    const columns = inferColumns(rows, schema, query.currentTable);
    const limited = rows.slice(0, 100);
    const fallback =
      limited.length === 1
        ? 'J’ai trouvé 1 résultat.'
        : `J’ai trouvé ${limited.length.toLocaleString('fr-FR')} résultats.`;
    return {
      answer: chatAnswer ?? fallback,
      resultType: hint === 'text' ? 'text' : 'table',
      rows: limited,
      columns,
      suggestions,
      mock,
    };
  }

  #empty(schema: Schema, currentTable?: string): AssistantResponse {
    return {
      answer: 'Posez votre question en français — par exemple un des exemples ci-dessous.',
      resultType: 'clarification',
      rows: [],
      columns: [],
      suggestions: Suggester.forSchema(schema, currentTable),
    };
  }

  async #clarification(
    query: AssistantQuery,
    schema: Schema,
    mock: boolean,
  ): Promise<AssistantResponse> {
    const entry = DatabaseRegistry.instance().get(query.dbId);
    const context = entry.context ?? null;
    const suggestions = Suggester.forSchema(schema, query.currentTable);

    let answer = templateClarification(schema, context);

    if (!mock) {
      try {
        const prompt = PromptBuilder.clarify(query.question, schema, context);
        const model = process.env.OLLAMA_CHAT_MODEL ?? 'llama3.2:3b';
        console.log(`[assistant] clarify (${model}) — humanising fallback`);
        const raw = await this.real.generate(model, prompt, { temperature: 0.4 });
        const cleaned = raw
          .trim()
          .replace(/^["'`«»]+|["'`«»]+$/g, '')
          .split(/\n+/)
          .filter((l) => l.trim())
          .join(' ')
          .trim();
        if (cleaned) answer = cleaned;
      } catch (err) {
        console.warn(
          `[assistant] clarify (llama) failed, using template: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return {
      answer,
      resultType: 'clarification',
      rows: [],
      columns: [],
      suggestions,
      mock,
    };
  }
}

// ---------------------------------------------------------------------------

function sentenceForScalar(
  value: CellValue,
  query: AssistantQuery,
  schema: Schema,
): string {
  if (value === null || value === undefined) {
    return 'Je n’ai pas pu calculer la réponse.';
  }
  const focus = pickFocus(query, schema);
  const noun = focus ? focus.label.toLowerCase() : 'résultats';
  if (typeof value === 'number') {
    const formatted = value.toLocaleString('fr-FR');
    if (/(combien|how many|nombre)/i.test(query.question)) {
      return `Il y a ${formatted} ${noun}.`;
    }
    return `Réponse : ${formatted}.`;
  }
  return `Réponse : ${value}.`;
}

function pickFocus(query: AssistantQuery, schema: Schema): TableInfo | null {
  if (query.currentTable) {
    return schema.tables.find((t) => t.name === query.currentTable) ?? null;
  }
  return schema.tables[0] ?? null;
}

function inferColumns(
  rows: Record<string, CellValue>[],
  schema: Schema,
  currentTable: string | undefined,
): Column[] {
  const sampleKeys = Object.keys(rows[0]);
  // Try to map keys to known columns from any table (current first).
  const ordered = currentTable
    ? [
        ...schema.tables.filter((t) => t.name === currentTable),
        ...schema.tables.filter((t) => t.name !== currentTable),
      ]
    : schema.tables;
  return sampleKeys.map((key) => {
    for (const t of ordered) {
      const c = t.columns.find((c) => c.key === key);
      if (c) return c;
    }
    return { key, label: humanizeFallback(key), type: inferType(rows, key) };
  });
}

function inferType(
  rows: Record<string, CellValue>[],
  key: string,
): Column['type'] {
  for (const r of rows) {
    const v = r[key];
    if (v === null || v === undefined) continue;
    if (typeof v === 'number') return 'number';
    if (typeof v === 'boolean') return 'bool';
    return 'text';
  }
  return 'text';
}

function templateClarification(
  schema: Schema,
  context: SchemaContext | null,
): string {
  const tableLabels = schema.tables.map((t) => t.label).slice(0, 5);
  const list = tableLabels.join(', ');
  if (context) {
    const enriched = schema.tables
      .slice(0, 4)
      .map((t) => {
        const purpose = context.tables[t.name];
        return purpose ? `${t.label} (${purpose.toLowerCase()})` : t.label;
      })
      .join(' ; ');
    return [
      `Cette question ne semble pas correspondre à cette base, qui concerne ${context.domain.toLowerCase()}.`,
      context.summary,
      `Vous pouvez plutôt me demander des choses sur : ${enriched}.`,
    ].join(' ');
  }
  return `Je ne suis pas sûr de comprendre. Cette base contient les tables suivantes : ${list}. Reformulez votre question en utilisant l’un de ces sujets.`;
}

function humanizeFallback(name: string): string {
  const cleaned = name.replace(/[_\s]+/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}
