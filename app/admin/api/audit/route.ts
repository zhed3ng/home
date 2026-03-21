import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin-auth';
import { isAllowedByGateway } from '@/lib/admin-gateway';
import { storageGet } from '@/lib/storage';
import type { AdminAuditEvent } from '@/lib/admin-security';

export async function GET(request: NextRequest) {
  if (!isAllowedByGateway(request).allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = getAdminEmailFromRequest(request);
  if (!adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = (await storageGet<AdminAuditEvent[]>('admin:audit:events')) || [];
  return NextResponse.json({ events });
}
