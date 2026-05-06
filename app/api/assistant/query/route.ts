import { NextResponse } from 'next/server';
import { Assistant } from '@/lib/Assistant';
import { UnknownDatabaseError } from '@/lib/errors';
import type { AssistantQuery, AssistantResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const assistant = new Assistant();

export async function POST(req: Request) {
  let body: Partial<AssistantQuery>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  if (!body.dbId || typeof body.dbId !== 'string') {
    return NextResponse.json({ error: 'Paramètre dbId manquant.' }, { status: 400 });
  }
  if (!body.question || typeof body.question !== 'string') {
    return NextResponse.json({ error: 'Question manquante.' }, { status: 400 });
  }

  try {
    const response: AssistantResponse = await assistant.ask({
      dbId: body.dbId,
      question: body.question,
      currentTable: body.currentTable,
      history: Array.isArray(body.history) ? body.history : undefined,
    });
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof UnknownDatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json(
      {
        answer: 'L’assistant fonctionne en mode démo simplifié.',
        resultType: 'error',
        rows: [],
        columns: [],
        suggestions: [],
      } satisfies AssistantResponse,
      { status: 200 },
    );
  }
}
