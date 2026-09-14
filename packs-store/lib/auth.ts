import { cookies } from 'next/headers';
import { readSession, SESSION_COOKIE } from './session';

export async function currentAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return readSession(token);
}
