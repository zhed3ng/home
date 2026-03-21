import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import {
  getAdminEmailFromHeaders,
  getAdminEmailFromRequest,
  getAdminSessionCookieName,
  getSessionEmail,
} from '@/lib/admin-auth';
import { hasGatewayRestrictionsConfigured, isAllowedByGateway } from '@/lib/admin-gateway';

export async function getAdminEmailForPage() {
  const gatewayEmail = await getAdminEmailFromHeaders();
  if (gatewayEmail) {
    return gatewayEmail;
  }

  if (hasGatewayRestrictionsConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  return getSessionEmail(cookieStore.get(getAdminSessionCookieName())?.value);
}

export async function getAdminEmailForRequest(request: NextRequest) {
  const gateway = isAllowedByGateway(request);
  if (gateway.allowed) {
    const email = getAdminEmailFromRequest(request);
    if (email) {
      return email;
    }
  }

  if (hasGatewayRestrictionsConfigured()) {
    return null;
  }

  return getSessionEmail(request.cookies.get(getAdminSessionCookieName())?.value);
}
