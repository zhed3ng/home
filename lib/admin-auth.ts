import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { isAllowedByGateway } from '@/lib/admin-gateway';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'zhe.joe.deng@gmail.com';
const ADMIN_HOST = process.env.ADMIN_HOST?.trim().toLowerCase() || 'admin.joedeng.net';
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL?.trim() || 'https://joedeng.net';

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

export function getAdminHost() {
  return ADMIN_HOST;
}

export function getPublicSiteUrl() {
  return PUBLIC_SITE_URL;
}

export function isAdminHost(host: string) {
  return host.trim().toLowerCase() === ADMIN_HOST;
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
