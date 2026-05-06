import { NextResponse } from 'next/server';
import { DatabaseRegistry } from '@/lib/DatabaseRegistry';
import { UnknownDatabaseError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dbId = searchParams.get('dbId');
  if (!dbId) {
    return NextResponse.json({ error: 'Paramètre dbId manquant.' }, { status: 400 });
  }
  try {
    const schema = DatabaseRegistry.instance().schema(dbId);
    return NextResponse.json(schema);
  } catch (err) {
    if (err instanceof UnknownDatabaseError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Impossible de lire la structure.' },
      { status: 500 },
    );
  }
}
