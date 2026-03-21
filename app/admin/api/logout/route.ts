import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    message: 'Admin authentication is managed by Cloudflare Access. Use /cdn-cgi/access/logout on the admin hostname to end that session.',
  });
}
