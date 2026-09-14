import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentAdmin } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { storeUrl } from '@/lib/store';
import type { PackOrder } from '@/lib/types';

const Schema = z.object({ status: z.enum(['approved','rejected']) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await currentAdmin()) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
  await ensureSchema(); const db = sql(); const { id } = await params;
  const approvedAt = parsed.data.status === 'approved' ? new Date().toISOString() : null;
  const [order] = await db`UPDATE pack_orders SET status=${parsed.data.status}, approved_at=${approvedAt}
    WHERE id=${id} AND status <> 'uploading' RETURNING *` as unknown as PackOrder[];
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  const [full] = await db`SELECT o.*, p.title AS pack_title, p.price_cents FROM pack_orders o JOIN packs p ON p.id=o.pack_id WHERE o.id=${id}` as unknown as PackOrder[];
  return NextResponse.json({ order: full, status_url: storeUrl(order.public_token) });
}
