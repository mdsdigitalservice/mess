import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSchema, sql } from '@/lib/db';
import { inspectObject } from '@/lib/r2';
import { BASE_PATH } from '@/lib/store';
import type { PackOrder } from '@/lib/types';

const Token = z.string().regex(/^[a-f0-9]{48}$/);

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const parsed = Token.safeParse((await params).token);
  if (!parsed.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  await ensureSchema(); const db = sql();
  const [order] = await db`SELECT * FROM pack_orders WHERE public_token=${parsed.data}` as unknown as PackOrder[];
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  if (order.status !== 'uploading') return NextResponse.json({ ok: true });
  try {
    const object = await inspectObject(order.proof_key);
    if (!object.ContentLength || object.ContentLength > 10 * 1024 * 1024) return NextResponse.json({ error: 'Comprovante inválido.' }, { status: 400 });
    await db`UPDATE pack_orders SET status='pending' WHERE id=${order.id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível confirmar o comprovante.' }, { status: 502 });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const parsed = Token.safeParse((await params).token);
  if (!parsed.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  await ensureSchema(); const db = sql();
  const [order] = await db`SELECT o.*, p.title AS pack_title, p.price_cents FROM pack_orders o JOIN packs p ON p.id=o.pack_id WHERE o.public_token=${parsed.data}` as unknown as PackOrder[];
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  const limit = Math.max(1, Number(process.env.DOWNLOAD_LIMIT || 3));
  const status = order.status === 'uploading' ? 'pending' : order.status;
  return NextResponse.json({
    status, pack_title: order.pack_title, price_cents: order.price_cents,
    remaining_downloads: Math.max(0, limit - order.download_count),
    download_url: status === 'approved' && order.download_count < limit ? `${BASE_PATH}/api/download/${parsed.data}` : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
