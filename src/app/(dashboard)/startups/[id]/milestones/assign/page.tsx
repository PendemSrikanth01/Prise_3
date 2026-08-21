import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MilestoneScope, Role } from '@prisma/client';
import { AssignMilestonesForm } from '@/components/startups/AssignMilestonesForm';
import { accessibleStartupWhere, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AssignMilestonesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (session.user.role !== Role.PROGRAM_LEAD && session.user.role !== Role.PROGRAM_TEAM && session.user.role !== Role.MENTOR && session.user.role !== Role.FOUNDER) notFound();
  const { id } = await params;
  const [startup, templates, assigned] = await Promise.all([
    prisma.startup.findFirst({ where: { id, ...accessibleStartupWhere(session.user) }, select: { id: true, name: true } }),
    prisma.milestoneTemplate.findMany({ where: { isActive: true, scope: MilestoneScope.STARTUP }, orderBy: [{ phase: 'asc' }, { title: 'asc' }] }),
    prisma.milestone.findMany({ where: { startupId: id, templateId: { not: null } }, select: { templateId: true } }),
  ]);
  if (!startup) notFound();
  const selectedIds = assigned.flatMap((item) => item.templateId ? [item.templateId] : []);
  const program = session.user.role === Role.PROGRAM_LEAD || session.user.role === Role.PROGRAM_TEAM;
  return <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8"><Link href={`/startups/${id}`} className="text-sm font-semibold text-prise-primary">← {startup.name}</Link><div className="mt-5"><div className="rounded-card bg-prise-sidebar p-6 text-white"><p className="text-sm text-white/55">Joint founder + mentor planning</p><h1 className="mt-2 text-2xl font-bold">Build a milestone plan around this startup</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">Select only the milestones this startup needs—from one to the full library. The plan stays editable; milestones with activity remain protected.</p></div><AssignMilestonesForm startupId={id} templates={templates} selectedIds={selectedIds} program={program} /></div></div>;
}
