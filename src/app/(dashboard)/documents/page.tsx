import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  await requireSession();
  redirect('/resources');
}
