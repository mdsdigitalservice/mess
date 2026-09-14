import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';
import { BASE_PATH } from '@/lib/store';

export async function POST(request: Request) {
  const publicStore = process.env.STORE_PUBLIC_URL || new URL(`${BASE_PATH}/`, request.url).toString();
  const response = NextResponse.redirect(new URL('login', publicStore), 303);
  response.cookies.set(SESSION_COOKIE, '', { path: '/packs', maxAge: 0 });
  return response;
}
