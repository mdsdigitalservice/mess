import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

const ParamsSchema = z.object({ id: z.coerce.number().int().positive() });

const PatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    category: z.enum(['house', 'flashback', 'sertanejo']),
    bpm: z.coerce.number().int().min(0).max(300).nullable(),
    duration: z.string().trim().max(20),
  })
  .partial();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const idResult = ParamsSchema.safeParse(await params);
  if (!idResult.success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  // `fields` só pode conter as chaves do schema acima (zod descarta chaves
  // desconhecidas por padrão) — é seguro interpolar `k` no SET porque não
  // vem de um objeto arbitrário do cliente, vem de um enum fixo de colunas.
  const fields = Object.entries(parsed.data).filter(([, v]) => v !== undefined);
  if (!fields.length) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });

  const setClause = fields.map(([k]) => `${k} = ?`).join(', ');
  const values = fields.map(([, v]) => v as string | number | null);

  const db = await getDb();
  const result = await db.execute({
    sql: `UPDATE tracks SET ${setClause} WHERE id = ?`,
    args: [...values, idResult.data.id],
  });
  if (result.rowsAffected === 0) return NextResponse.json({ error: 'Faixa não encontrada' }, { status: 404 });

  const select = await db.execute({ sql: 'SELECT * FROM tracks WHERE id = ?', args: [idResult.data.id] });
  return NextResponse.json({ track: select.rows[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const idResult = ParamsSchema.safeParse(await params);
  if (!idResult.success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const db = await getDb();
  const result = await db.execute({ sql: 'DELETE FROM tracks WHERE id = ?', args: [idResult.data.id] });
  if (result.rowsAffected === 0) return NextResponse.json({ error: 'Faixa não encontrada' }, { status: 404 });

  // Só apaga o registro do banco — o MP3 físico continua em public_html/media/
  // no cPanel (não temos endpoint de exclusão remota no upload.php). Limpeza
  // de arquivo órfão, se algum dia importar, é manual ou via um endpoint futuro.
  return NextResponse.json({ ok: true });
}
