import { NextRequest, NextResponse } from 'next/server';
import { deleteAdminSession, getAdminSessionCookieName } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  await deleteAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);

  const response = NextResponse.json({
    message: 'Signed out from the in-app admin session. If Cloudflare Access is enabled, also use /cdn-cgi/access/logout on the admin hostname.',
  });
  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: 0,
  });
  return response;
}
