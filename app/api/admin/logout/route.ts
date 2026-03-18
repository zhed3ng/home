import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  clearAdminSession,
  getAdminSessionCookieOptions,
  getAdminTokenFromRequest,
} from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const token = getAdminTokenFromRequest(request);
  await clearAdminSession(token);

  const response = NextResponse.json({ message: 'Signed out.' });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
