import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';
import { MEDIA_DIR } from '@/lib/paths';
import type { Track } from '@/lib/types';

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
  const values = fields.map(([, v]) => v);

  const result = db.prepare(`UPDATE tracks SET ${setClause} WHERE id = ?`).run(...values, idResult.data.id);
  if (result.changes === 0) return NextResponse.json({ error: 'Faixa não encontrada' }, { status: 404 });

  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(idResult.data.id);
  return NextResponse.json({ track });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const idResult = ParamsSchema.safeParse(await params);
  if (!idResult.success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(idResult.data.id) as Track | undefined;
  if (!track) return NextResponse.json({ error: 'Faixa não encontrada' }, { status: 404 });

  db.prepare('DELETE FROM tracks WHERE id = ?').run(idResult.data.id);

  // Só apaga do disco arquivos que vivem dentro de MEDIA_DIR (uploads feitos
  // por este painel) — faixas com src externo (ex: WordPress antigo) ficam intactas.
  if (track.src?.startsWith('/media/')) {
    const filename = track.src.slice('/media/'.length);
    const resolved = path.resolve(MEDIA_DIR, filename);
    if (resolved === MEDIA_DIR || resolved.startsWith(MEDIA_DIR + path.sep)) {
      await fs.unlink(resolved).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
