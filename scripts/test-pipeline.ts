/**
 * Standalone smoke test for the LLM pipeline.
 * Bypasses Next.js. Confirms that BOTH Qwen and Llama get called
 * for a normal question (count clients in Lyon).
 *
 * Usage:
 *   OLLAMA_BASE_URL=http://localhost:11434 \
 *   OLLAMA_SQL_MODEL=qwen2.5-coder:7b \
 *   OLLAMA_CHAT_MODEL=llama3.2:3b \
 *   LLM_MODE=auto \
 *   npx tsx scripts/test-pipeline.ts
 */
import { DatabaseRegistry } from '../lib/DatabaseRegistry';
import { Assistant } from '../lib/Assistant';
import type { ChatMessage } from '../lib/types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function main() {
  const buf = readFileSync(join(process.cwd(), 'demo-databases/association.db'));
  const { id } = DatabaseRegistry.instance().register(buf);
  console.log(`registered dbId=${id}`);
  const assistant = new Assistant();

  // Reproduce the screenshot bug:
  //   1. "Combien d'éléments ce mois-ci ?" on events → 1 (correct).
  //   2. "Combien de lignes dans membres ?" → must give 12, not be polluted
  //      by the "ce mois-ci" filter from the previous turn.
  const history: ChatMessage[] = [];

  const turns: Array<{ question: string; table: string }> = [
    { question: "Combien d'éléments ce mois-ci ?", table: 'events' },
    { question: 'Combien de lignes dans membres ?', table: 'events' },
  ];

  for (const turn of turns) {
    console.log(`\n— Q: ${turn.question}`);
    const t0 = Date.now();
    const r = await assistant.ask({
      dbId: id,
      question: turn.question,
      currentTable: turn.table,
      history: history.slice(-6),
    });
    const ms = Date.now() - t0;
    console.log(`  answer (${ms}ms) → ${r.answer}`);
    console.log(`  rows=${r.rows.length}  mock=${r.mock}`);
    if (r.rows.length > 0 && r.rows.length <= 8) {
      for (const row of r.rows) console.log('    ', row);
    }
    history.push({ role: 'user', text: turn.question });
    history.push({ role: 'assistant', text: r.answer });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
