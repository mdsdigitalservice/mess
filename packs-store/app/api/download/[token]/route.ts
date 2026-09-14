import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSchema, sql } from '@/lib/db';
import { signedGet } from '@/lib/r2';
import { slugify } from '@/lib/store';

const Token = z.string().regex(/^[a-f0-9]{48}$/);

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const parsed = Token.safeParse((await params).token);
  if (!parsed.success) return NextResponse.json({ error: 'Link inválido.' }, { status: 400 });
  await ensureSchema(); const db = sql();
  const [order] = await db`SELECT o.id, o.download_count, p.title, p.bundle_key FROM pack_orders o JOIN packs p ON p.id=o.pack_id
    WHERE o.public_token=${parsed.data} AND o.status='approved'` as unknown as Array<{ id: string; download_count: number; title: string; bundle_key: string | null }>;
  const limit = Math.max(1, Number(process.env.DOWNLOAD_LIMIT || 3));
  if (!order?.bundle_key) return NextResponse.json({ error: 'Download ainda não liberado.' }, { status: 403 });
  if (order.download_count >= limit) return NextResponse.json({ error: 'Limite de downloads atingido.' }, { status: 410 });
  let url: string;
  try {
    url = await signedGet(order.bundle_key, { downloadName: `${slugify(order.title)}.zip`, contentType: 'application/zip' });
  } catch {
    return NextResponse.json({ error: 'Arquivo temporariamente indisponível.' }, { status: 503 });
  }
  const changed = await db`UPDATE pack_orders SET download_count=download_count+1 WHERE id=${order.id} AND download_count < ${limit} RETURNING id`;
  if (!changed.length) return NextResponse.json({ error: 'Limite de downloads atingido.' }, { status: 410 });
  const response = NextResponse.redirect(url, 302); response.headers.set('Cache-Control', 'private, no-store'); return response;
}
