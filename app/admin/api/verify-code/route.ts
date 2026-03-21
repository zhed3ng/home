import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminSession,
  getAdminSessionCookieName,
  getAdminSessionTtlSeconds,
  isAllowedAdminEmail,
  verifyStoredCode,
} from '@/lib/admin-auth';
import { appendAuditEvent, clearVerifyFailures, isVerifyLocked, registerVerifyFailure } from '@/lib/admin-security';
import { getRequestCountry, getRequestIp, getRequestUserAgent } from '@/lib/admin-gateway';

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const email = String(payload?.email || '').trim().toLowerCase();
  const code = String(payload?.code || '').trim();
  const ip = getRequestIp(request);
  const country = getRequestCountry(request);
  const userAgent = getRequestUserAgent(request);

  if (!isAllowedAdminEmail(email)) {
    return NextResponse.json({ error: 'This email is not allowed to access the admin console.' }, { status: 403 });
  }

  if (await isVerifyLocked(email, ip)) {
    await appendAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'verify-code',
      outcome: 'blocked',
      email,
      ip,
      country,
      userAgent,
      detail: 'Verification temporarily locked after repeated failures.',
    });
    return NextResponse.json({ error: 'Too many failed attempts. Please try again later.' }, { status: 429 });
  }

  const isValid = await verifyStoredCode(email, code);
  if (!isValid) {
    const failure = await registerVerifyFailure(email, ip);
    await appendAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'verify-code',
      outcome: 'failure',
      email,
      ip,
      country,
      userAgent,
      detail: failure.locked
        ? `Verification locked for ${failure.retryAfterMinutes} minutes.`
        : `Incorrect code. Attempt ${failure.attempts}.`,
    });
    return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 401 });
  }

  await clearVerifyFailures(email, ip);
  const token = await createAdminSession(email);
  const response = NextResponse.json({ message: 'Admin session created.' });
  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: getAdminSessionTtlSeconds(),
  });
  await appendAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'verify-code',
    outcome: 'success',
    email,
    ip,
    country,
    userAgent,
    detail: 'Admin session cookie issued.',
  });
  return response;
}
