import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE = 'mess_packs_session';

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 24) throw new Error('SESSION_SECRET ausente ou curto.');
  return new TextEncoder().encode(value);
}

export async function createSession(username: string) {
  return new SignJWT({ sub: username, scope: 'packs-admin' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('8h').sign(secret());
}

export async function readSession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.scope === 'packs-admin' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
