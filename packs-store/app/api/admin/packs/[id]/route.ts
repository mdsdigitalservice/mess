import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentAdmin } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { deleteObject } from '@/lib/r2';
import type { Pack } from '@/lib/types';

const PatchSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(1200).optional(),
  price_cents: z.number().int().min(100).max(10_000_000).optional(),
  tracks_count: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await currentAdmin()) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  await ensureSchema();
  const db = sql(); const { id } = await params;
  const [current] = await db`SELECT * FROM packs WHERE id = ${id}` as unknown as Pack[];
  if (!current) return NextResponse.json({ error: 'Pack não encontrado.' }, { status: 404 });
  if (parsed.data.active === true && !current.bundle_key) return NextResponse.json({ error: 'Envie o ZIP antes de publicar.' }, { status: 400 });
  const next = { ...current, ...parsed.data };
  const [pack] = await db`UPDATE packs SET title=${next.title}, description=${next.description}, price_cents=${next.price_cents},
    tracks_count=${next.tracks_count}, active=${next.active}, updated_at=NOW() WHERE id=${id} RETURNING *` as unknown as Pack[];
  return NextResponse.json({ pack });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await currentAdmin()) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  await ensureSchema(); const db = sql(); const { id } = await params;
  const [pack] = await db`SELECT * FROM packs WHERE id=${id}` as unknown as Pack[];
  if (!pack) return NextResponse.json({ error: 'Pack não encontrado.' }, { status: 404 });
  const [order] = await db`SELECT id FROM pack_orders WHERE pack_id=${id} LIMIT 1`;
  if (order) return NextResponse.json({ error: 'Esse pack possui pedidos. Desative-o em vez de apagar.' }, { status: 409 });
  await db`DELETE FROM packs WHERE id=${id}`;
  await Promise.all([pack.cover_key, pack.preview_key, pack.bundle_key].filter(Boolean).map((key) => deleteObject(key!).catch(() => {})));
  return NextResponse.json({ ok: true });
}
