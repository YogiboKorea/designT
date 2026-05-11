import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-fallback-secret-key-please-change'
);

const COOKIE_NAME = 'admin_session';

export async function createSession() {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const session = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) return false;

  try {
    const { payload } = await jwtVerify(sessionCookie, SECRET_KEY);
    return payload.role === 'admin';
  } catch (error) {
    return false;
  }
}
