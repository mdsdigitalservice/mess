import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { signedGet } from '@/lib/r2';
import type { Pack } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureSchema();
    const db = sql();
    const packs = await db`SELECT * FROM packs WHERE active = TRUE AND bundle_key IS NOT NULL ORDER BY created_at DESC` as unknown as Pack[];
    const publicPacks = await Promise.all(packs.map(async (pack) => ({
      id: pack.id, slug: pack.slug, title: pack.title, description: pack.description,
      price_cents: pack.price_cents, tracks_count: pack.tracks_count,
      cover_url: pack.cover_key ? await signedGet(pack.cover_key, { expiresIn: 3600 }) : null,
      preview_url: pack.preview_key ? await signedGet(pack.preview_key, { expiresIn: 3600, contentType: 'audio/mpeg' }) : null,
    })));
    return NextResponse.json({
      packs: publicPacks,
      pix: { key: process.env.PIX_KEY || '', beneficiary: process.env.PIX_BENEFICIARY || '', city: process.env.PIX_CITY || '' },
      whatsapp: process.env.STORE_WHATSAPP || '5565996226120',
    }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } });
  } catch {
    return NextResponse.json({ error: 'Loja ainda não configurada.' }, { status: 503 });
  }
}
