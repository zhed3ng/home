import { NextRequest, NextResponse } from 'next/server';
import { askJoe } from '@/lib/ask-joe';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const question = String(body?.question || '').trim();

  if (!question) {
    return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
  }

  try {
    const answer = await askJoe(question);
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AskJoe failed.' },
      { status: 500 },
    );
  }
}
