import { jwtVerify, SignJWT } from 'jose';

// Só usa `jose` (puro JS, roda no Edge runtime do middleware).
// Nada de node:crypto aqui — isso fica em lib/password.ts, que só o
// runtime Node.js (rotas de API) importa.

export const SESSION_COOKIE = 'mess_admin_session';
const SESSION_TTL = '8h';

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET ausente ou curto demais — configure no .env');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== 'string') return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
