import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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
  const args: (string | number)[] = [];

  if (category) {
    clauses.push('category = ?');
    args.push(category);
  }
  if (cursor !== null) {
    clauses.push('id < ?');
    args.push(cursor);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM tracks ${where} ORDER BY id DESC LIMIT ?`,
    args: [...args, limit],
  });

  const tracks = result.rows;
  const nextCursor = tracks.length === limit ? (tracks[tracks.length - 1].id as number) : null;

  return NextResponse.json({ tracks, nextCursor });
}
