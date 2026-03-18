import { NextRequest, NextResponse } from 'next/server';
import { saveSiteContent, getSiteContent, siteContentSchema } from '@/lib/content';
import { getAdminTokenFromRequest, validateAdminSession } from '@/lib/admin-auth';

async function requireAdmin(request: NextRequest) {
  const token = getAdminTokenFromRequest(request);
  return validateAdminSession(token);
}

export async function GET(request: NextRequest) {
  const adminEmail = await requireAdmin(request);
  if (!adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const content = await getSiteContent();
  return NextResponse.json(content);
}

export async function PUT(request: NextRequest) {
  const adminEmail = await requireAdmin(request);
  if (!adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = siteContentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const content = await saveSiteContent(parsed.data);
  return NextResponse.json({ ...content, message: `Saved to Vercel KV for ${adminEmail}.` });
}
