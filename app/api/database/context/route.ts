import { NextResponse } from 'next/server';
import { DatabaseRegistry } from '@/lib/DatabaseRegistry';
import { SchemaContextBuilder } from '@/lib/SchemaContextBuilder';
import { UnknownDatabaseError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const builder = new SchemaContextBuilder();

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
    const context = await builder.build(entry.tables, entry.db);
    DatabaseRegistry.instance().setContext(body.dbId, context);
    return NextResponse.json({ context });
  } catch (err) {
    if (err instanceof UnknownDatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Impossible de construire le contexte.' },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  let body: { dbId?: string; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }
  if (!body.dbId || !body.context || typeof body.context !== 'object') {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }
  try {
    DatabaseRegistry.instance().setContext(
      body.dbId,
      body.context as Parameters<DatabaseRegistry['setContext']>[1],
    );
    return NextResponse.json({ context: body.context });
  } catch (err) {
    if (err instanceof UnknownDatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dbId = searchParams.get('dbId');
  if (!dbId) {
    return NextResponse.json({ error: 'dbId manquant.' }, { status: 400 });
  }
  try {
    const entry = DatabaseRegistry.instance().get(dbId);
    return NextResponse.json({ context: entry.context ?? null });
  } catch (err) {
    if (err instanceof UnknownDatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
