import { NextResponse } from 'next/server';
import { DatabaseRegistry } from '@/lib/DatabaseRegistry';
import { InvalidSqliteFileError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'Aucun fichier reçu.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { id, tables } = DatabaseRegistry.instance().register(buffer);

    return NextResponse.json({ dbId: id, tables });
  } catch (err) {
    if (err instanceof InvalidSqliteFileError) {
      return NextResponse.json({ error: err.message }, { status: 415 });
    }
    return NextResponse.json(
      { error: 'Impossible de lire le fichier.' },
      { status: 500 },
    );
  }
}
