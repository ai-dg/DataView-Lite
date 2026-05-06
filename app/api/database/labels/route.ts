import { NextResponse } from 'next/server';
import { DatabaseRegistry } from '@/lib/DatabaseRegistry';
import { LabelRefiner, type RefinementMap } from '@/lib/LabelRefiner';
import { UnknownDatabaseError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const refiner = new LabelRefiner();

export async function POST(req: Request) {
  let body: { dbId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }
  if (!body.dbId) {
    return NextResponse.json({ error: 'dbId manquant.' }, { status: 400 });
  }

  try {
    const entry = DatabaseRegistry.instance().get(body.dbId);
    const refined: RefinementMap = await refiner.refine(entry.tables);

    // Apply on the registry so subsequent /schema and /assistant calls see them.
    if (refined.tables) {
      for (const t of entry.tables) {
        const v = refined.tables[t.name];
        if (v) t.label = v;
      }
    }
    if (refined.columns) {
      for (const t of entry.tables) {
        for (const c of t.columns) {
          const v = refined.columns[`${t.name}.${c.key}`];
          if (v) c.label = v;
        }
      }
    }

    return NextResponse.json({ refined, tables: entry.tables });
  } catch (err) {
    if (err instanceof UnknownDatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Impossible de raffiner les libellés.' },
      { status: 500 },
    );
  }
}
