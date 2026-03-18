import { NextResponse, type NextRequest } from 'next/server';
import { hasGatewayRestrictionsConfigured, isAllowedByGateway } from '@/lib/admin-gateway';

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (!hasGatewayRestrictionsConfigured()) {
    return NextResponse.next();
  }

  const gateway = isAllowedByGateway(request);
  if (gateway.allowed) {
    return NextResponse.next();
  }

  return NextResponse.json(
    {
      error:
        'This admin surface is protected. Present an allowed Google identity, approved device token, country, or IP before continuing.',
    },
    { status: 403 },
  );
}

export const config = {
  matcher: ['/admin/:path*'],
};
