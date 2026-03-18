import { AdminConsole } from '@/components/admin-console';
import { getSiteContent } from '@/lib/content';
import { getAdminTokenFromCookies, validateAdminSession } from '@/lib/admin-auth';

export default async function AdminPage() {
  const token = await getAdminTokenFromCookies();
  const adminEmail = await validateAdminSession(token);
  const content = adminEmail ? await getSiteContent() : null;

  return (
    <main className="admin-layout">
      <AdminConsole
        adminEmail={adminEmail}
        initialContent={content ? JSON.stringify(content, null, 2) : ''}
      />
    </main>
  );
}
