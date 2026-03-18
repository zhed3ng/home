import { NextRequest, NextResponse } from 'next/server';
import { saveSiteContent, getSiteContent, siteContentSchema } from '@/lib/content';
import { getAdminTokenFromRequest, validateAdminSession } from '@/lib/admin-auth';
import { getRequestCountry, getRequestIp, getRequestUserAgent, isAllowedByGateway } from '@/lib/admin-gateway';
import { appendAuditEvent } from '@/lib/admin-security';

async function requireAdmin(request: NextRequest) {
  const gateway = isAllowedByGateway(request);
  if (!gateway.allowed) {
    return { adminEmail: null, gatewayReason: gateway.reason };
  }

  const token = getAdminTokenFromRequest(request);
  const adminEmail = await validateAdminSession(token);
  return { adminEmail, gatewayReason: gateway.reason };
}

export async function GET(request: NextRequest) {
  const { adminEmail, gatewayReason } = await requireAdmin(request);
  if (!adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const content = await getSiteContent();
  await appendAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'content-read',
    outcome: 'success',
    email: adminEmail,
    ip: getRequestIp(request),
    country: getRequestCountry(request),
    userAgent: getRequestUserAgent(request),
    detail: `Content loaded via gateway ${gatewayReason}.`,
  });
  return NextResponse.json(content);
}

export async function PUT(request: NextRequest) {
  const { adminEmail, gatewayReason } = await requireAdmin(request);
  if (!adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = siteContentSchema.safeParse(payload);
  if (!parsed.success) {
    await appendAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'content-write',
      outcome: 'failure',
      email: adminEmail,
      ip: getRequestIp(request),
      country: getRequestCountry(request),
      userAgent: getRequestUserAgent(request),
      detail: 'Schema validation failed during content write.',
    });
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const content = await saveSiteContent(parsed.data);
  await appendAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'content-write',
    outcome: 'success',
    email: adminEmail,
    ip: getRequestIp(request),
    country: getRequestCountry(request),
    userAgent: getRequestUserAgent(request),
    detail: `Content saved via gateway ${gatewayReason}.`,
  });
  return NextResponse.json({ ...content, message: `Saved to Vercel KV for ${adminEmail}.` });
}
