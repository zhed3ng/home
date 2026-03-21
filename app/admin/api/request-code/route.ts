import { NextRequest, NextResponse } from 'next/server';
import { createVerificationCode, getAdminCodeTtlMinutes, isAllowedAdminEmail, saveVerificationCode } from '@/lib/admin-auth';
import { sendAdminCodeEmail } from '@/lib/email';
import { appendAuditEvent, consumeRequestCodeQuota } from '@/lib/admin-security';
import { getRequestCountry, getRequestIp, getRequestUserAgent } from '@/lib/admin-gateway';

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const email = String(payload?.email || '').trim().toLowerCase();
  const ip = getRequestIp(request);
  const country = getRequestCountry(request);
  const userAgent = getRequestUserAgent(request);

  if (!isAllowedAdminEmail(email)) {
    await appendAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'request-code',
      outcome: 'blocked',
      email,
      ip,
      country,
      userAgent,
      detail: 'Rejected because the email is not in the admin allowlist.',
    });
    return NextResponse.json({ error: 'This email is not allowed to access the admin console.' }, { status: 403 });
  }

  const quota = await consumeRequestCodeQuota(email, ip);
  if (!quota.allowed) {
    await appendAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'request-code',
      outcome: 'blocked',
      email,
      ip,
      country,
      userAgent,
      detail: `Rate limited after ${quota.attempts} attempts in ${quota.retryAfterMinutes} minutes.`,
    });
    return NextResponse.json({ error: 'Too many code requests. Please try again later.' }, { status: 429 });
  }

  const code = createVerificationCode();
  await saveVerificationCode(email, code);
  await sendAdminCodeEmail({ email, code, ttlMinutes: getAdminCodeTtlMinutes() });
  await appendAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'request-code',
    outcome: 'success',
    email,
    ip,
    country,
    userAgent,
    detail: 'Verification code sent successfully.',
  });

  return NextResponse.json({ message: 'Verification code sent.' });
}
