import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPassword, verifyPlainPassword } from '@/lib/password';
import { createSession, SESSION_COOKIE } from '@/lib/session';
import { allowAction } from '@/lib/db';

const Schema = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  try {
    if (!await allowAction(`login:${ip}`, 5, 15)) return NextResponse.json({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, { status: 429 });
  } catch {
    return NextResponse.json({ error: 'Banco da loja ainda não configurado.' }, { status: 503 });
  }
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Informe usuário e senha.' }, { status: 400 });
  const { username, password } = parsed.data;
  const credentials = [
    [process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD_HASH, process.env.ADMIN_PASSWORD],
    [process.env.PACKS_USERNAME, process.env.PACKS_PASSWORD_HASH, process.env.PACKS_PASSWORD],
  ];
  const valid = credentials.some(([user, hash, plain]) => Boolean(
    user && username === user && (
      (hash && verifyPassword(password, hash)) ||
      (plain && verifyPlainPassword(password, plain))
    )
  ));
  if (!valid) return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSession(username), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/packs', maxAge: 8 * 60 * 60,
  });
  return response;
}
