import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailCode } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body?.email || '').trim().toLowerCase();
  const code = String(body?.code || '').trim();

  if (!email || !code) {
    return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
  }

  const sessionToken = await verifyEmailCode(email, code);
  if (!sessionToken) {
    return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 401 });
  }

  return NextResponse.json({ sessionToken });
}
