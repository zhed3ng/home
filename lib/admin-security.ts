import { storageGet, storageSet } from '@/lib/storage';

const AUDIT_LOG_KEY = 'admin:audit:events';
const MAX_AUDIT_EVENTS = Number(process.env.ADMIN_AUDIT_LOG_LIMIT || 200);
const VERIFY_FAILURE_LIMIT = Number(process.env.ADMIN_VERIFY_FAILURE_LIMIT || 5);
const VERIFY_LOCKOUT_MINUTES = Number(process.env.ADMIN_VERIFY_LOCKOUT_MINUTES || 15);
const REQUEST_CODE_LIMIT = Number(process.env.ADMIN_REQUEST_CODE_LIMIT || 3);
const REQUEST_CODE_WINDOW_MINUTES = Number(process.env.ADMIN_REQUEST_CODE_WINDOW_MINUTES || 5);

export type AdminAuditEvent = {
  timestamp: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked' | 'info';
  email?: string;
  ip?: string;
  country?: string;
  userAgent?: string;
  detail?: string;
};

export async function appendAuditEvent(event: AdminAuditEvent) {
  const existing = (await storageGet<AdminAuditEvent[]>(AUDIT_LOG_KEY)) || [];
  existing.unshift(event);
  await storageSet(AUDIT_LOG_KEY, existing.slice(0, MAX_AUDIT_EVENTS));
}

function verifyFailureKey(email: string, ip: string) {
  return `admin:verify-fail:${email}:${ip}`;
}

function verifyLockKey(email: string, ip: string) {
  return `admin:verify-lock:${email}:${ip}`;
}

function requestRateKey(email: string, ip: string) {
  return `admin:request-rate:${email}:${ip}`;
}

export async function isVerifyLocked(email: string, ip: string) {
  return Boolean(await storageGet(verifyLockKey(email, ip)));
}

export async function registerVerifyFailure(email: string, ip: string) {
  const key = verifyFailureKey(email, ip);
  const current = (await storageGet<number>(key)) || 0;
  const next = current + 1;
  const windowSeconds = VERIFY_LOCKOUT_MINUTES * 60;
  await storageSet(key, next, windowSeconds);
  if (next >= VERIFY_FAILURE_LIMIT) {
    await storageSet(verifyLockKey(email, ip), true, windowSeconds);
    return { locked: true, attempts: next, retryAfterMinutes: VERIFY_LOCKOUT_MINUTES };
  }
  return { locked: false, attempts: next, retryAfterMinutes: VERIFY_LOCKOUT_MINUTES };
}

export async function clearVerifyFailures(email: string, ip: string) {
  await storageSet(verifyFailureKey(email, ip), 0, 1);
  await storageSet(verifyLockKey(email, ip), false, 1);
}

export async function consumeRequestCodeQuota(email: string, ip: string) {
  const key = requestRateKey(email, ip);
  const current = (await storageGet<number>(key)) || 0;
  const next = current + 1;
  await storageSet(key, next, REQUEST_CODE_WINDOW_MINUTES * 60);
  return { allowed: next <= REQUEST_CODE_LIMIT, attempts: next, limit: REQUEST_CODE_LIMIT };
}
