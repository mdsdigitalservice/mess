import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import type { PackOrder } from '@/lib/types';

export async function GET() {
  if (!await currentAdmin()) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  await ensureSchema();
  const orders = await sql()`SELECT o.*, p.title AS pack_title, p.price_cents FROM pack_orders o JOIN packs p ON p.id=o.pack_id WHERE o.status <> 'uploading' ORDER BY o.created_at DESC` as unknown as PackOrder[];
  return NextResponse.json({ orders }, { headers: { 'Cache-Control': 'no-store' } });
}
