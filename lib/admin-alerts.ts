import { Resend } from 'resend';
import type { AdminAuditEvent } from '@/lib/admin-security';

export async function sendAdminAlertEmail(event: AdminAuditEvent) {
  const apiKey = process.env.RESEND_API_KEY;
  const mailFrom = process.env.MAIL_FROM || 'admin@updates.example.com';
  const alertTo = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL;

  if (!apiKey || !alertTo) {
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: mailFrom,
    to: alertTo,
    subject: `[Admin Alert] ${event.action} · ${event.outcome}`,
    text: [
      `Timestamp: ${event.timestamp}`,
      `Action: ${event.action}`,
      `Outcome: ${event.outcome}`,
      `Email: ${event.email || 'n/a'}`,
      `IP: ${event.ip || 'n/a'}`,
      `Country: ${event.country || 'n/a'}`,
      `User-Agent: ${event.userAgent || 'n/a'}`,
      `Detail: ${event.detail || 'n/a'}`,
    ].join('\n'),
  });
}
