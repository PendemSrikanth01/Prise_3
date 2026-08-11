import { StartupStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PageIntro } from '@/components/ui/PageIntro';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const groups = await prisma.startup.groupBy({ by: ['status'], _count: { _all: true } });
  const ordered = [StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION, StartupStatus.WITHDRAWN, StartupStatus.DISCONTINUED, StartupStatus.GRADUATED];
  const values = new Map(groups.map((group) => [group.status, group._count._all]));
  return <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8"><PageIntro title="Pipeline" description="A truthful operating-status view of the imported PRISE 3.0 cohort. Application-stage history was not present in the supplied seed, so it is not invented here." /><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{ordered.map((status) => <div key={status} className="rounded-card border border-prise-border bg-white p-5 shadow-card"><div className="text-3xl font-bold tracking-tight">{values.get(status) ?? 0}</div><div className="mt-2 text-sm font-medium text-prise-text-secondary">{status.replaceAll('_', ' ').toLowerCase()}</div></div>)}</div></div>;
}
