import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { storageDel, storageGet, storageSet } from '@/lib/storage';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'zhe.joe.deng@gmail.com';
const LOGIN_CODE_TTL_MINUTES = Number(process.env.LOGIN_CODE_TTL_MINUTES || 10);
const SESSION_TTL_SECONDS = 60 * 60 * 8;
export const ADMIN_SESSION_COOKIE = 'admin_session';

function codeKey(email: string) {
  return `admin:code:${email}`;
}

function sessionKey(token: string) {
  return `admin:session:${token}`;
}

export function isAllowedAdminEmail(email: string) {
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export async function issueEmailCode(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const code = `${crypto.randomInt(0, 1000000)}`.padStart(6, '0');
  await storageSet(codeKey(normalizedEmail), code, LOGIN_CODE_TTL_MINUTES * 60);
  return { code, ttlMinutes: LOGIN_CODE_TTL_MINUTES };
}

export async function verifyEmailCode(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const storedCode = await storageGet<string>(codeKey(normalizedEmail));
  if (!storedCode || storedCode !== code.trim()) {
    return null;
  }

  await storageDel(codeKey(normalizedEmail));

  const token = crypto.randomUUID();
  await storageSet(sessionKey(token), normalizedEmail, SESSION_TTL_SECONDS);
  return token;
}

export async function validateAdminSession(token: string) {
  if (!token) return null;
  const value = await storageGet<string>(sessionKey(token));
  return value || null;
}

export function getAdminTokenFromRequest(request: NextRequest) {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value || request.headers.get('x-admin-token') || '';
}

export async function getAdminTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value || '';
}

export async function clearAdminSession(token: string) {
  if (!token) return;
  await storageDel(sessionKey(token));
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}
