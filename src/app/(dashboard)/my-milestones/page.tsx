import { notFound, redirect } from 'next/navigation';
import { requireSession, resolveFounderStartupId } from '@/lib/auth';

export default async function MyMilestonesPage() {
  const session = await requireSession();
  const startupId = await resolveFounderStartupId(session.user);
  if (!startupId) notFound();
  redirect(`/startups/${startupId}#milestones`);
}
