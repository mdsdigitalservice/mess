import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Track } from '@/lib/types';

export const runtime = 'nodejs';

const ALLOWED_CATEGORIES = new Set(['house', 'flashback', 'sertanejo']);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100);
  const cursorParam = searchParams.get('cursor');
  const cursor = cursorParam ? Number(cursorParam) : null;

  if (category && !ALLOWED_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 });
  }
  if (cursorParam && !Number.isInteger(cursor)) {
    return NextResponse.json({ error: 'Cursor inválido' }, { status: 400 });
  }

  // Paginação por cursor (id decrescente) em vez de OFFSET: custo constante
  // por página mesmo que a tabela cresça muito além dos ~120 sets atuais.
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (category) {
    clauses.push('category = ?');
    params.push(category);
  }
  if (cursor !== null) {
    clauses.push('id < ?');
    params.push(cursor);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const tracks = db
    .prepare(`SELECT * FROM tracks ${where} ORDER BY id DESC LIMIT ?`)
    .all(...params, limit) as Track[];

  const nextCursor = tracks.length === limit ? tracks[tracks.length - 1].id : null;

  return NextResponse.json({ tracks, nextCursor });
}
