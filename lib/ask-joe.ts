import OpenAI from 'openai';
import { getSiteContent } from '@/lib/content';

export async function askJoe(question: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const content = await getSiteContent();
  const client = new OpenAI({ apiKey });
  const completion = await client.responses.create({
    model: process.env.ASK_JOE_MODEL || 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content:
          'You are AskJoe, the official assistant for Zhe (Joe) Deng. Answer only using the provided website context. If something is unavailable, say so briefly and invite the visitor to email directly.',
      },
      {
        role: 'user',
        content: `Website context: ${JSON.stringify(content)}\n\nVisitor question: ${question}`,
      },
    ],
  });

  return completion.output_text;
}
