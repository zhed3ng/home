import { NextResponse, type NextRequest } from 'next/server';
import { getAdminHost, getPublicSiteUrl, isAdminHost } from '@/lib/admin-auth';
import { hasGatewayRestrictionsConfigured, isAllowedByGateway } from '@/lib/admin-gateway';

function getRequestHost(request: NextRequest) {
  return (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').trim().toLowerCase();
}

export function middleware(request: NextRequest) {
  const host = getRequestHost(request);
  const pathname = request.nextUrl.pathname;
  const onAdminHost = isAdminHost(host);

  if (!onAdminHost && pathname.startsWith('/admin')) {
    const url = new URL(`https://${getAdminHost()}`);
    url.pathname = pathname === '/admin' ? '/' : pathname;
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 307);
  }

  if (!onAdminHost && !pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (!hasGatewayRestrictionsConfigured()) {
    return NextResponse.json(
      {
        error: 'Admin host is missing gateway protection. Configure Cloudflare Access or another trusted identity proxy before exposing this hostname.',
      },
      { status: 503 },
    );
  }

  const gateway = isAllowedByGateway(request);
  if (!gateway.allowed) {
    return NextResponse.json(
      {
        error:
          'This admin host is protected. Present an allowed Google identity, approved device token, country, or IP before continuing.',
      },
      { status: 403 },
    );
  }

  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.rewrite(url);
  }

  if (pathname === '/favicon.ico') {
    return NextResponse.redirect(getPublicSiteUrl(), 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*'],
};
