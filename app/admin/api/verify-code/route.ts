import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminSessionCookieOptions, verifyEmailCode } from '@/lib/admin-auth';
import { sendAdminAlertEmail } from '@/lib/admin-alerts';
import { getRequestCountry, getRequestIp, getRequestUserAgent, isAllowedByGateway } from '@/lib/admin-gateway';
import { appendAuditEvent, clearVerifyFailures, isVerifyLocked, registerVerifyFailure } from '@/lib/admin-security';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body?.email || '').trim().toLowerCase();
  const code = String(body?.code || '').trim();
  const ip = getRequestIp(request);
  const country = getRequestCountry(request);
  const userAgent = getRequestUserAgent(request);
  const gateway = isAllowedByGateway(request);

  if (!gateway.allowed) {
    const event = {
      timestamp: new Date().toISOString(),
      action: 'verify-code',
      outcome: 'blocked' as const,
      email,
      ip,
      country,
      userAgent,
      detail: `Gateway denied access: ${gateway.reason}`,
    };
    await appendAuditEvent(event);
    await sendAdminAlertEmail(event);
    return NextResponse.json({ error: 'Admin access is restricted at the gateway layer.' }, { status: 403 });
  }

  if (!email || !code) {
    return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
  }

  if (await isVerifyLocked(email, ip)) {
    const event = {
      timestamp: new Date().toISOString(),
      action: 'verify-code',
      outcome: 'blocked' as const,
      email,
      ip,
      country,
      userAgent,
      detail: 'Verification lockout active.',
    };
    await appendAuditEvent(event);
    await sendAdminAlertEmail(event);
    return NextResponse.json({ error: 'Too many failed attempts. Verification is temporarily locked.' }, { status: 423 });
  }

  const sessionToken = await verifyEmailCode(email, code);
  if (!sessionToken) {
    const failure = await registerVerifyFailure(email, ip);
    const event = {
      timestamp: new Date().toISOString(),
      action: 'verify-code',
      outcome: failure.locked ? ('blocked' as const) : ('failure' as const),
      email,
      ip,
      country,
      userAgent,
      detail: failure.locked
        ? `Verification locked after ${failure.attempts} failed attempts.`
        : `Invalid or expired verification code (${failure.attempts} failed attempts).`,
    };
    await appendAuditEvent(event);
    if (failure.locked) {
      await sendAdminAlertEmail(event);
    }
    return NextResponse.json(
      {
        error: failure.locked
          ? 'Too many failed attempts. Verification is temporarily locked.'
          : 'Invalid or expired verification code.',
      },
      { status: failure.locked ? 423 : 401 },
    );
  }

  await clearVerifyFailures(email, ip);
  await appendAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'verify-code',
    outcome: 'success',
    email,
    ip,
    country,
    userAgent,
    detail: `Admin session issued using gateway ${gateway.reason}.`,
  });

  const response = NextResponse.json({ message: 'Verified.' });
  response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, getAdminSessionCookieOptions());
  return response;
}
