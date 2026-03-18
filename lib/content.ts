import { z } from 'zod';
import { storageGet, storageSet } from '@/lib/storage';

const newsItemSchema = z.object({
  date: z.string().min(1),
  text: z.string().min(1),
});

export const siteContentSchema = z.object({
  hero: z.object({
    name: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    email: z.string().email(),
    cvUrl: z.string().min(1),
  }),
  askJoe: z.object({
    intro: z.string().min(1),
    suggestedQuestions: z.array(z.string().min(1)).min(1),
  }),
  news: z.array(newsItemSchema),
});

export type SiteContent = z.infer<typeof siteContentSchema>;

export const defaultContent: SiteContent = {
  hero: {
    name: 'Zhe (Joe) Deng',
    title: 'Assistant Professor, Decision & System Sciences',
    subtitle: "Haub School of Business, Saint Joseph's University",
    email: 'zdeng@sju.edu',
    cvUrl: '/ZheDeng_CV_Jan2026.pdf',
  },
  askJoe: {
    intro:
      'AskJoe is now backed by a secure AI route so visitors can ask about research, teaching, grants, and collaboration without exposing client-side secrets.',
    suggestedQuestions: [
      'What are Joe Deng\'s main research themes?',
      'Which courses does he teach?',
      'How can I collaborate or reach out?',
    ],
  },
  news: [
    {
      date: '2024 · Publication',
      text: 'From Smartphones to Smart Students accepted at Information Systems Research.',
    },
    {
      date: '2024 · Media',
      text: 'Interviewed on classroom smartphone policies and student learning outcomes.',
    },
    {
      date: '2023 · Talk',
      text: 'Invited talk on AI in education and digital experimentation.',
    },
  ],
};

const CONTENT_KEY = 'site:content';

export async function getSiteContent(): Promise<SiteContent> {
  const existing = await storageGet(CONTENT_KEY);
  if (!existing) {
    await storageSet(CONTENT_KEY, defaultContent);
    return defaultContent;
  }

  return siteContentSchema.parse(existing);
}

export async function saveSiteContent(content: SiteContent): Promise<SiteContent> {
  const parsed = siteContentSchema.parse(content);
  await storageSet(CONTENT_KEY, parsed);
  return parsed;
}
