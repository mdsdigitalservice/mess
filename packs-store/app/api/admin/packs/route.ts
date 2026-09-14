import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentAdmin } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { randomId, slugify } from '@/lib/store';
import type { Pack } from '@/lib/types';

const CreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1200).default(''),
  price_cents: z.number().int().min(100).max(10_000_000),
  tracks_count: z.number().int().min(0).max(999).default(0),
});

export async function GET() {
  if (!await currentAdmin()) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  await ensureSchema();
  const packs = await sql()`SELECT * FROM packs ORDER BY created_at DESC` as unknown as Pack[];
  return NextResponse.json({ packs });
}

export async function POST(request: Request) {
  if (!await currentAdmin()) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Dados do pack inválidos.' }, { status: 400 });
  await ensureSchema();
  const db = sql();
  const id = randomId(12);
  const slug = `${slugify(parsed.data.title)}-${id.slice(0, 6)}`;
  const [pack] = await db`INSERT INTO packs (id, slug, title, description, price_cents, tracks_count)
    VALUES (${id}, ${slug}, ${parsed.data.title}, ${parsed.data.description}, ${parsed.data.price_cents}, ${parsed.data.tracks_count}) RETURNING *` as unknown as Pack[];
  return NextResponse.json({ pack }, { status: 201 });
}
