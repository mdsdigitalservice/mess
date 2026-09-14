import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { signedGet } from '@/lib/r2';
import type { PackOrder } from '@/lib/types';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await currentAdmin()) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  await ensureSchema(); const { id } = await params;
  const [order] = await sql()`SELECT * FROM pack_orders WHERE id=${id}` as unknown as PackOrder[];
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  try {
    return NextResponse.redirect(await signedGet(order.proof_key, { expiresIn: 300 }), 302);
  } catch {
    return NextResponse.json({ error: 'Comprovante indisponível.' }, { status: 503 });
  }
}
