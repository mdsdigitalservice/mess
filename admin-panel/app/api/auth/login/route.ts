import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rate-limit';
import { createSessionToken, SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

const LoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`login:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedUser || !expectedHash) {
    console.error('ADMIN_USERNAME / ADMIN_PASSWORD_HASH não configurados no .env');
    return NextResponse.json({ error: 'Admin não configurado no servidor.' }, { status: 500 });
  }

  // Calcula os dois lados sempre, mesmo com usuário errado — evita que o tempo
  // de resposta vaze se o usuário existe ou não.
  const validUser = username === expectedUser;
  const validPass = verifyPassword(password, expectedHash);

  if (!validUser || !validPass) {
    return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
  }

  const token = await createSessionToken(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  });
  return res;
}
