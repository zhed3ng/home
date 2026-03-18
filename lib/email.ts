import { Resend } from 'resend';

export async function sendAdminCodeEmail(params: {
  email: string;
  code: string;
  ttlMinutes: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const mailFrom = process.env.MAIL_FROM || 'admin@updates.example.com';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: mailFrom,
    to: params.email,
    subject: 'Your admin verification code',
    text: `Your verification code is ${params.code}. It expires in ${params.ttlMinutes} minutes.`,
  });
}
