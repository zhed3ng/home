import { NextRequest, NextResponse } from 'next/server';
import { saveSiteContent, getSiteContent, siteContentSchema } from '@/lib/content';
import { validateAdminSession } from '@/lib/admin-auth';

export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json(content);
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('x-admin-token') || '';
  const valid = await validateAdminSession(token);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = siteContentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const content = await saveSiteContent(parsed.data);
  return NextResponse.json({ ...content, message: 'Saved to Vercel KV.' });
}
