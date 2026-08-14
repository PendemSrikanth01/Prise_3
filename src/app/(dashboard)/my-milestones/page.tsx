import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';

export default async function MyMilestonesPage() {
  const session = await requireSession();
  if (!session.user.founderOfStartupId) notFound();
  redirect(`/startups/${session.user.founderOfStartupId}#milestones`);
}
