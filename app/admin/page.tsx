import { AdminConsole } from '@/components/admin-console';
import { getSiteContent } from '@/lib/content';

export default async function AdminPage() {
  const content = await getSiteContent();
  return <main className="admin-layout"><AdminConsole initialContent={JSON.stringify(content, null, 2)} /></main>;
}
