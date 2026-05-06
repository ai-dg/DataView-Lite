import { LlmClient } from './LlmClient';
import type { TableInfo } from './types';

/**
 * Optional bonus: ask the chat LLM (llama3.2:3b) to refine the heuristic
 * labels into more natural French ones. Generic by design — the LLM only
 * sees the *raw* names and the *heuristic* labels, never the data.
 *
 * One batch call per database (caller is expected to cache by schema hash).
 */
export class LabelRefiner {
  constructor(private readonly llm: LlmClient = new LlmClient()) {}

  async refine(tables: TableInfo[]): Promise<RefinementMap> {
    if (tables.length === 0) return {};
    if (!(await this.llm.isAlive())) {
      console.log('[labels] Ollama unreachable → keeping heuristic labels');
      return {};
    }

    // Per project rules (.claude/rules/llm.md), label refinement uses the
    // SQL-tuned model: it follows JSON contracts much more strictly than
    // the chat model, which kept echoing the placeholder « Libellé table ».
    const model = process.env.OLLAMA_SQL_MODEL ?? 'qwen2.5-coder:7b';
    const prompt = buildPrompt(tables);
    console.log(
      `[labels] refining (${model}) — ${tables.length} table(s), ${countColumns(
        tables,
      )} column(s)`,
    );

    let raw: string;
    try {
      raw = await this.llm.generate(model, prompt, {
        json: true,
        temperature: 0.1,
        timeoutMs: 60_000,
      });
    } catch (err) {
      console.warn(
        `[labels] LLM call failed → keeping heuristic labels: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return {};
    }

    return parseAndFilter(raw, tables);
  }
}

export type RefinementMap = {
  tables?: Record<string, string>;
  columns?: Record<string, string>;
};

// ---------------------------------------------------------------------------

function buildPrompt(tables: TableInfo[]): string {
  const digest = tables.map((t) => ({
    name: t.name,
    heuristic: t.label,
    columns: t.columns.map((c) => ({
      name: c.key,
      heuristic: c.label,
      type: c.type,
    })),
  }));

  return [
    'Tu transformes des noms techniques de tables et colonnes SQLite en libellés français lisibles pour un utilisateur non technique.',
    '',
    'RÈGLES :',
    "1. Réponds UNIQUEMENT par UN objet JSON valide, sans markdown, sans texte hors JSON.",
    "2. Ne préfixe JAMAIS un libellé par les mots « Libellé », « Nom », « Champ », « Table » : donne directement le mot français.",
    "3. Garde le heuristique quand il est déjà bon. Ne change rien sans raison.",
    "4. Corrige quand il est cryptique (« P dt », « Crt ts »), redondant (« Commandes identifiant », « Utilisateurs membres »), ou contient des fragments anglais bruts (« Pub year », « Mileage km », « Loan date »).",
    "5. Acronymes en MAJUSCULES quand pertinent (VIN, ISBN, IBAN, CP, URL, ID).",
    "6. Capitalise seulement la première lettre. Pas d'autres majuscules sauf acronymes.",
    "7. Pour les colonnes de jointure (`*_id`, `*_ref`, `*_link`), utilise « Identifiant <entité> » (ex. `usr_ref` → « Identifiant utilisateur »).",
    "8. Reste générique : ne suppose aucun métier. Base-toi UNIQUEMENT sur les noms bruts.",
    '',
    'EXEMPLES (entrée → sortie correcte) :',
    "  table « tbl_ord_2019 »            →  « Commandes »",
    "  table « x_payment_log »            →  « Paiements »",
    "  colonne « ord_id » (table commandes)→  « Numéro de commande »",
    "  colonne « usr_ref »                →  « Identifiant utilisateur »",
    "  colonne « dt_ord »                 →  « Date de commande »",
    "  colonne « amt_tot »                →  « Montant total »",
    "  colonne « st_flag »                →  « Statut »",
    "  colonne « crt_ts »                 →  « Date de création »",
    "  colonne « eml_addr »               →  « E-mail »",
    "  colonne « loc_cty »                →  « Ville »",
    "  colonne « is_pd »                  →  « Payé »",
    '',
    'STRUCTURE DE SORTIE (utilise EXACTEMENT ces clés) :',
    '{',
    '  "tables":  { "<nom_table>": "<libellé court>" },',
    '  "columns": { "<nom_table>.<nom_colonne>": "<libellé court>" }',
    '}',
    '',
    "Tu peux omettre une entrée si le heuristique te convient.",
    '',
    `SCHÉMA À RAFFINER : ${JSON.stringify(digest)}`,
  ].join('\n');
}

function parseAndFilter(raw: string, tables: TableInfo[]): RefinementMap {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');
  let parsed: RefinementMap;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn('[labels] LLM returned invalid JSON — keeping heuristic labels');
    return {};
  }

  // Whitelist: only keep keys that exist in the actual schema.
  const validTables = new Set(tables.map((t) => t.name));
  const validCols = new Set<string>();
  for (const t of tables) {
    for (const c of t.columns) validCols.add(`${t.name}.${c.key}`);
  }

  const out: RefinementMap = {};
  if (parsed.tables) {
    out.tables = {};
    for (const [k, v] of Object.entries(parsed.tables)) {
      if (!validTables.has(k) || typeof v !== 'string') continue;
      const sanitized = sanitizeLabel(v);
      if (sanitized) out.tables[k] = sanitized;
    }
  }
  if (parsed.columns) {
    out.columns = {};
    for (const [k, v] of Object.entries(parsed.columns)) {
      if (!validCols.has(k) || typeof v !== 'string') continue;
      const sanitized = sanitizeLabel(v);
      if (sanitized) out.columns[k] = sanitized;
    }
  }
  return out;
}

/**
 * Server-side post-processing of a refined label.
 * Rejects (returns null) any label that looks worse than the heuristic
 * (template echoes, verbose, junk).
 */
function sanitizeLabel(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;

  // Strip echoed prompt placeholders.
  s = s
    .replace(/^libellé\s+(table|colonne|du|de\s+la|de\s+le|des)\s*/i, '')
    .replace(/^nom\s+(de\s+la|du|des)\s+/i, '')
    .replace(/^le\s+|^la\s+|^les\s+|^l['’]/i, '')
    .replace(/^(table|colonne|champ)\s+/i, '')
    .trim();

  if (!s) return null;
  if (s.length > 40) return null; // verbose → keep heuristic
  if (/^<.*>$/.test(s)) return null; // unfilled placeholder

  // Capitalise first letter.
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function countColumns(tables: TableInfo[]): number {
  return tables.reduce((n, t) => n + t.columns.length, 0);
}
