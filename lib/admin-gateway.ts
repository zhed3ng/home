import { NextRequest } from 'next/server';

function listFromCsv(value?: string) {
  return new Set(
    String(value || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function hasEntries(values: Set<string>) {
  return values.size > 0;
}

export function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function getRequestCountry(request: NextRequest) {
  return (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code') ||
    'unknown'
  ).toUpperCase();
}

export function getRequestUserAgent(request: NextRequest) {
  return request.headers.get('user-agent') || 'unknown';
}

export function getGatewayIdentity(request: NextRequest) {
  const googleEmail = (
    request.headers.get('cf-access-authenticated-user-email') ||
    request.headers.get('x-goog-authenticated-user-email') ||
    request.headers.get('x-auth-request-email') ||
    ''
  )
    .replace(/^accounts\.google\.com:/, '')
    .trim()
    .toLowerCase();

  const ip = getRequestIp(request);
  const country = getRequestCountry(request).toLowerCase();
  const deviceToken =
    request.cookies.get('admin_device')?.value || request.headers.get('x-admin-device-token') || '';

  return { googleEmail, ip, country, deviceToken };
}

export function hasGatewayRestrictionsConfigured() {
  const allowedGoogleEmails = listFromCsv(process.env.ADMIN_ALLOWED_GOOGLE_EMAILS);
  const allowedIps = listFromCsv(process.env.ADMIN_ALLOWED_IPS);
  const allowedCountries = listFromCsv(process.env.ADMIN_ALLOWED_COUNTRIES);
  const allowedDeviceTokens = listFromCsv(process.env.ADMIN_ALLOWED_DEVICE_TOKENS);
  const bypassSecret = process.env.ADMIN_GATEWAY_BYPASS_SECRET?.trim();

  return (
    hasEntries(allowedGoogleEmails) ||
    hasEntries(allowedIps) ||
    hasEntries(allowedCountries) ||
    hasEntries(allowedDeviceTokens) ||
    Boolean(bypassSecret)
  );
}

export function isAllowedByGateway(request: NextRequest) {
  const allowedGoogleEmails = listFromCsv(process.env.ADMIN_ALLOWED_GOOGLE_EMAILS);
  const allowedIps = listFromCsv(process.env.ADMIN_ALLOWED_IPS);
  const allowedCountries = listFromCsv(process.env.ADMIN_ALLOWED_COUNTRIES);
  const allowedDeviceTokens = listFromCsv(process.env.ADMIN_ALLOWED_DEVICE_TOKENS);
  const bypassSecret = process.env.ADMIN_GATEWAY_BYPASS_SECRET?.trim();
  const providedSecret = request.headers.get('x-admin-gateway-secret')?.trim();

  const identity = getGatewayIdentity(request);

  if (!hasGatewayRestrictionsConfigured()) {
    return { allowed: true, reason: 'gateway-not-configured', identity };
  }

  if (bypassSecret && providedSecret && bypassSecret === providedSecret) {
    return { allowed: true, reason: 'gateway-secret', identity };
  }

  if (identity.googleEmail && allowedGoogleEmails.has(identity.googleEmail)) {
    return { allowed: true, reason: 'google-email', identity };
  }

  if (identity.ip !== 'unknown' && allowedIps.has(identity.ip.toLowerCase())) {
    return { allowed: true, reason: 'ip', identity };
  }

  if (identity.country !== 'unknown' && allowedCountries.has(identity.country)) {
    return { allowed: true, reason: 'country', identity };
  }

  if (identity.deviceToken && allowedDeviceTokens.has(identity.deviceToken.toLowerCase())) {
    return { allowed: true, reason: 'device-token', identity };
  }

  return { allowed: false, reason: 'no-gateway-match', identity };
}
