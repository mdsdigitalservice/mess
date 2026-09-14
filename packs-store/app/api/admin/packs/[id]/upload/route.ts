import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentAdmin } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { deleteObject, inspectObject, signedUpload } from '@/lib/r2';
import { uniqueObjectKey } from '@/lib/store';
import type { Pack } from '@/lib/types';

const TYPES = {
  cover: { max: 10 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp'], column: 'cover_key' },
  preview: { max: 50 * 1024 * 1024, mimes: ['audio/mpeg'], column: 'preview_key' },
  bundle: { max: 2 * 1024 * 1024 * 1024, mimes: ['application/zip', 'application/x-zip-compressed'], column: 'bundle_key' },
} as const;
const Schema = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('prepare'), kind: z.enum(['cover','preview','bundle']), filename: z.string().min(1).max(255), content_type: z.string().min(1).max(100), size: z.number().int().positive() }),
  z.object({ phase: z.literal('complete'), kind: z.enum(['cover','preview','bundle']), key: z.string().min(1).max(500) }),
]);

function extension(filename: string) {
  return filename.toLowerCase().split('.').pop()?.replace(/[^a-z0-9]/g, '') || 'bin';
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await currentAdmin()) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Upload inválido.' }, { status: 400 });
  await ensureSchema(); const db = sql(); const { id } = await params;
  const [pack] = await db`SELECT * FROM packs WHERE id=${id}` as unknown as Pack[];
  if (!pack) return NextResponse.json({ error: 'Pack não encontrado.' }, { status: 404 });
  const config = TYPES[parsed.data.kind];

  if (parsed.data.phase === 'prepare') {
    if (parsed.data.size > config.max || !(config.mimes as readonly string[]).includes(parsed.data.content_type)) {
      return NextResponse.json({ error: 'Tipo ou tamanho de arquivo não permitido.' }, { status: 400 });
    }
    const key = uniqueObjectKey(`packs/${id}/${parsed.data.kind}`, pack.title, extension(parsed.data.filename));
    try {
      return NextResponse.json({ key, upload_url: await signedUpload(key, parsed.data.content_type), headers: { 'Content-Type': parsed.data.content_type } });
    } catch {
      return NextResponse.json({ error: 'Cloudflare R2 ainda não configurado.' }, { status: 503 });
    }
  }

  if (!parsed.data.key.startsWith(`packs/${id}/${parsed.data.kind}/`)) return NextResponse.json({ error: 'Objeto R2 inválido.' }, { status: 400 });
  try {
    const object = await inspectObject(parsed.data.key);
    if (!object.ContentLength || object.ContentLength > config.max) return NextResponse.json({ error: 'Arquivo vazio ou acima do limite.' }, { status: 400 });
    const oldKey = pack[config.column];
    if (parsed.data.kind === 'cover') await db`UPDATE packs SET cover_key=${parsed.data.key}, updated_at=NOW() WHERE id=${id}`;
    if (parsed.data.kind === 'preview') await db`UPDATE packs SET preview_key=${parsed.data.key}, updated_at=NOW() WHERE id=${id}`;
    if (parsed.data.kind === 'bundle') await db`UPDATE packs SET bundle_key=${parsed.data.key}, updated_at=NOW() WHERE id=${id}`;
    if (oldKey && oldKey !== parsed.data.key) await deleteObject(oldKey).catch(() => {});
    const [updated] = await db`SELECT * FROM packs WHERE id=${id}` as unknown as Pack[];
    return NextResponse.json({ pack: updated });
  } catch {
    return NextResponse.json({ error: 'Não foi possível confirmar o arquivo no R2.' }, { status: 502 });
  }
}
