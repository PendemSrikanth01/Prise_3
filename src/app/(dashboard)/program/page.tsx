import { MilestoneScope, StartupStatus } from '@prisma/client';
import { PageIntro } from '@/components/ui/PageIntro';
import { prisma } from '@/lib/prisma';
import { accessibleStartupWhere, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProgramPage() {
  const session = await requireSession();
  const scope = accessibleStartupWhere(session.user);
  const [active, inactive, programMilestones, fees] = await Promise.all([
    prisma.startup.count({ where: { ...scope, status: StartupStatus.ACTIVE } }),
    prisma.startup.count({ where: { ...scope, status: { in: [StartupStatus.DISCONTINUED, StartupStatus.WITHDRAWN] } } }),
    prisma.milestoneTemplate.count({ where: { scope: MilestoneScope.PROGRAM } }),
    prisma.startup.aggregate({ where: scope, _sum: { agreedFee: true, totalFeePaid: true } }),
  ]);
  const cards = [
    ['Active startups', active],
    ['Inactive startups', inactive],
    ['Program milestones', programMilestones],
    ['Fees received', `₹${Number(fees._sum.totalFeePaid ?? 0).toLocaleString('en-IN')}`],
  ];
  return <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8"><PageIntro title="Program" description="PRISE is the program; PRISE 3.0 is the current cohort. Workshops, reviews and sessions will sit here rather than being mixed into startup milestones." /><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <div key={String(label)} className="rounded-card border border-prise-border bg-white p-5 shadow-card"><div className="text-3xl font-bold tracking-tight">{value}</div><div className="mt-2 text-sm text-prise-text-secondary">{label}</div></div>)}</div></div>;
}
