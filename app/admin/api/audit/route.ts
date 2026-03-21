import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailForRequest } from '@/lib/admin-session';
import { storageGet } from '@/lib/storage';
import type { AdminAuditEvent } from '@/lib/admin-security';

export async function GET(request: NextRequest) {
  const adminEmail = await getAdminEmailForRequest(request);
  if (!adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = (await storageGet<AdminAuditEvent[]>('admin:audit:events')) || [];
  return NextResponse.json({ events });
}
