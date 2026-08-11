import { EmptyPanel, PageIntro } from '@/components/ui/PageIntro';
import { accessibleStartupWhere, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  const session = await requireSession();
  const hasGlobalDirectory = ['PROGRAM_LEAD', 'PROGRAM_TEAM', 'INVESTOR'].includes(session.user.role);
  const startupIds = hasGlobalDirectory ? [] : (await prisma.startup.findMany({
    where: accessibleStartupWhere(session.user),
    select: { id: true },
  })).map((startup) => startup.id);
  const people = await prisma.person.findMany({
    where: hasGlobalDirectory ? { isActive: true } : {
      isActive: true,
      OR: [
        { id: session.user.id },
        { founderOfStartupId: { in: startupIds } },
        { assignments: { some: { startupId: { in: startupIds } } } },
      ],
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true },
  });
  return <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8"><PageIntro title="People" description="Program team, mentors, interns, experts and investors will be managed here with assignment-scoped access." />{people.length ? <div className="mt-6 overflow-hidden rounded-card border border-prise-border bg-white shadow-card"><div className="divide-y divide-prise-border">{people.map((person) => <div key={person.id} className="flex items-center gap-3 px-5 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple-bg text-sm font-bold text-accent-purple">{person.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><div className="text-sm font-semibold">{person.name}</div><div className="mt-0.5 text-xs text-prise-text-secondary">{person.role.replaceAll('_', ' ').toLowerCase()}</div></div></div>)}</div></div> : <EmptyPanel title="No people seeded" description="Only create real people records after permissions and assignments are configured." />}</div>;
}
