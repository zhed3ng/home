import { AdminConsole } from '@/components/admin-console';
import { getSiteContent } from '@/lib/content';
import { getAdminTokenFromCookies, validateAdminSession } from '@/lib/admin-auth';
import { storageGet } from '@/lib/storage';
import type { AdminAuditEvent } from '@/lib/admin-security';

export default async function AdminPage() {
  const token = await getAdminTokenFromCookies();
  const adminEmail = await validateAdminSession(token);
  const content = adminEmail ? await getSiteContent() : null;
  const auditEvents = adminEmail ? ((await storageGet<AdminAuditEvent[]>('admin:audit:events')) || []) : [];

  return (
    <main className="admin-layout">
      <AdminConsole
        adminEmail={adminEmail}
        initialContent={content ? JSON.stringify(content, null, 2) : ''}
        initialAuditEvents={auditEvents}
      />
    </main>
  );
}
