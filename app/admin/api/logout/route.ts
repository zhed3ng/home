import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  clearAdminSession,
  getAdminSessionCookieOptions,
  getAdminTokenFromRequest,
} from '@/lib/admin-auth';
import { getRequestCountry, getRequestIp, getRequestUserAgent } from '@/lib/admin-gateway';
import { appendAuditEvent } from '@/lib/admin-security';

export async function POST(request: NextRequest) {
  const token = getAdminTokenFromRequest(request);
  await clearAdminSession(token);
  await appendAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'logout',
    outcome: 'success',
    ip: getRequestIp(request),
    country: getRequestCountry(request),
    userAgent: getRequestUserAgent(request),
    detail: 'Admin session cleared.',
  });

  const response = NextResponse.json({ message: 'Signed out.' });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
