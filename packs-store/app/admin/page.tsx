import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/auth';
import { BASE_PATH } from '@/lib/store';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!await currentAdmin()) redirect('/login');
  return <Dashboard />;
}
