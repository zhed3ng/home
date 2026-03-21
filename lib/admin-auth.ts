import { randomInt, randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { isAllowedByGateway } from '@/lib/admin-gateway';
import { storageDel, storageGet, storageSet } from '@/lib/storage';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'zhe.joe.deng@gmail.com';
const ADMIN_HOST = process.env.ADMIN_HOST?.trim().toLowerCase() || 'admin.joedeng.net';
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL?.trim() || 'https://joedeng.net';
const ADMIN_SESSION_COOKIE = 'admin_session';
const ADMIN_CODE_TTL_MINUTES = Number(process.env.ADMIN_CODE_TTL_MINUTES || 10);
const ADMIN_SESSION_TTL_DAYS = Number(process.env.ADMIN_SESSION_TTL_DAYS || 7);

function listFromCsv(value?: string) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getAllowedAdminEmails() {
  return new Set([ADMIN_EMAIL, ...listFromCsv(process.env.ADMIN_ALLOWED_GOOGLE_EMAILS)]);
}

function readGatewayEmail(headerStore: Pick<Headers, 'get'>) {
  return (
    headerStore.get('cf-access-authenticated-user-email') ||
    headerStore.get('x-goog-authenticated-user-email') ||
    headerStore.get('x-auth-request-email') ||
    ''
  )
    .replace(/^accounts\.google\.com:/, '')
    .trim()
    .toLowerCase();
}

function resolveAdminEmail(candidateEmail: string) {
  if (!candidateEmail) return null;
  return getAllowedAdminEmails().has(candidateEmail) ? candidateEmail : null;
}

function verificationCodeKey(email: string) {
  return `admin:code:${email}`;
}

function sessionKey(token: string) {
  return `admin:session:${token}`;
}

export function getAdminHost() {
  return ADMIN_HOST;
}

export function getPublicSiteUrl() {
  return PUBLIC_SITE_URL;
}

export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE;
}

export function getAdminCodeTtlMinutes() {
  return ADMIN_CODE_TTL_MINUTES;
}

export function getAdminSessionTtlSeconds() {
  return ADMIN_SESSION_TTL_DAYS * 24 * 60 * 60;
}

export function isAdminHost(host: string) {
  return host.trim().toLowerCase() === ADMIN_HOST;
}

export function isAllowedAdminEmail(email: string) {
  return Boolean(resolveAdminEmail(email.trim().toLowerCase()));
}

export function createVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function saveVerificationCode(email: string, code: string) {
  await storageSet(verificationCodeKey(email), { code }, ADMIN_CODE_TTL_MINUTES * 60);
}

export async function verifyStoredCode(email: string, code: string) {
  const stored = await storageGet<{ code: string }>(verificationCodeKey(email));
  if (!stored) {
    return false;
  }

  if (stored.code !== code) {
    return false;
  }

  await storageDel(verificationCodeKey(email));
  return true;
}

export async function createAdminSession(email: string) {
  const token = randomUUID();
  await storageSet(sessionKey(token), { email }, getAdminSessionTtlSeconds());
  return token;
}

export async function getSessionEmail(token?: string | null) {
  if (!token) {
    return null;
  }

  const session = await storageGet<{ email: string }>(sessionKey(token));
  return resolveAdminEmail(session?.email || '');
}

export async function deleteAdminSession(token?: string | null) {
  if (!token) {
    return;
  }
  await storageDel(sessionKey(token));
}

export function getAdminEmailFromRequest(request: NextRequest) {
  const gateway = isAllowedByGateway(request);
  if (!gateway.allowed) {
    return null;
  }

  return resolveAdminEmail(gateway.identity.googleEmail);
}

export async function getAdminEmailFromHeaders() {
  const headerStore = await headers();
  return resolveAdminEmail(readGatewayEmail(headerStore));
}
