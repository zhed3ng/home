import { NextRequest, NextResponse } from 'next/server';
import { issueEmailCode, isAllowedAdminEmail } from '@/lib/admin-auth';
import { sendAdminCodeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body?.email || '').trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  if (!isAllowedAdminEmail(email)) {
    return NextResponse.json({ error: 'Email is not allowed.' }, { status: 403 });
  }

  try {
    const { code, ttlMinutes } = await issueEmailCode(email);
    await sendAdminCodeEmail({ email, code, ttlMinutes });
    return NextResponse.json({ message: 'Verification code sent.' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send verification code.' },
      { status: 500 },
    );
  }
}
