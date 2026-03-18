import { NextRequest, NextResponse } from 'next/server';
import { issueEmailCode, isAllowedAdminEmail } from '@/lib/admin-auth';
import { sendAdminAlertEmail } from '@/lib/admin-alerts';
import { getRequestCountry, getRequestIp, getRequestUserAgent, isAllowedByGateway } from '@/lib/admin-gateway';
import { sendAdminCodeEmail } from '@/lib/email';
import { appendAuditEvent, consumeRequestCodeQuota } from '@/lib/admin-security';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body?.email || '').trim().toLowerCase();
  const ip = getRequestIp(request);
  const country = getRequestCountry(request);
  const userAgent = getRequestUserAgent(request);
  const gateway = isAllowedByGateway(request);

  if (!gateway.allowed) {
    const event = {
      timestamp: new Date().toISOString(),
      action: 'request-code',
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

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  if (!isAllowedAdminEmail(email)) {
    const event = {
      timestamp: new Date().toISOString(),
      action: 'request-code',
      outcome: 'blocked' as const,
      email,
      ip,
      country,
      userAgent,
      detail: 'Disallowed admin email.',
    };
    await appendAuditEvent(event);
    await sendAdminAlertEmail(event);
    return NextResponse.json({ error: 'Email is not allowed.' }, { status: 403 });
  }

  const quota = await consumeRequestCodeQuota(email, ip);
  if (!quota.allowed) {
    const event = {
      timestamp: new Date().toISOString(),
      action: 'request-code',
      outcome: 'blocked' as const,
      email,
      ip,
      country,
      userAgent,
      detail: `Request-code rate limit exceeded (${quota.attempts}/${quota.limit}).`,
    };
    await appendAuditEvent(event);
    await sendAdminAlertEmail(event);
    return NextResponse.json({ error: 'Too many verification code requests. Try again later.' }, { status: 429 });
  }

  try {
    const { code, ttlMinutes } = await issueEmailCode(email);
    await sendAdminCodeEmail({ email, code, ttlMinutes });
    await appendAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'request-code',
      outcome: 'success',
      email,
      ip,
      country,
      userAgent,
      detail: `Verification code issued using gateway ${gateway.reason}.`,
    });
    return NextResponse.json({ message: 'Verification code sent.' });
  } catch (error) {
    const event = {
      timestamp: new Date().toISOString(),
      action: 'request-code',
      outcome: 'failure' as const,
      email,
      ip,
      country,
      userAgent,
      detail: error instanceof Error ? error.message : 'Failed to send verification code.',
    };
    await appendAuditEvent(event);
    await sendAdminAlertEmail(event);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send verification code.' },
      { status: 500 },
    );
  }
}
