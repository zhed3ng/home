import { AdminConsole } from '@/components/admin-console';
import { getSiteContent } from '@/lib/content';
import { getAdminHost, getPublicSiteUrl } from '@/lib/admin-auth';
import { getAdminEmailForPage } from '@/lib/admin-session';
import { storageGet } from '@/lib/storage';
import type { AdminAuditEvent } from '@/lib/admin-security';

export default async function AdminPage() {
  const adminEmail = await getAdminEmailForPage();
  const content = adminEmail ? await getSiteContent() : null;
  const auditEvents = adminEmail ? ((await storageGet<AdminAuditEvent[]>('admin:audit:events')) || []) : [];

  return (
    <main className="admin-layout">
      <AdminConsole
        adminEmail={adminEmail}
        adminHost={getAdminHost()}
        publicSiteUrl={getPublicSiteUrl()}
        initialContent={content ? JSON.stringify(content, null, 2) : ''}
        initialAuditEvents={auditEvents}
      />
    </main>
  );
}
