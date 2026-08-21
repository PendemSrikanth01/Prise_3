import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MilestoneScope, Role } from '@prisma/client';
import { assignMilestonesAction } from '@/app/actions/workflows';
import { SubmitButton } from '@/components/ui/FormButtons';
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
  const selected = new Set(assigned.flatMap((item) => item.templateId ? [item.templateId] : []));
  const program = session.user.role === Role.PROGRAM_LEAD || session.user.role === Role.PROGRAM_TEAM;
  return <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8"><Link href={`/startups/${id}`} className="text-sm font-semibold text-prise-primary">← {startup.name}</Link><div className="mt-5"><div className="rounded-card bg-prise-sidebar p-6 text-white"><p className="text-sm text-white/55">Joint founder + mentor planning</p><h1 className="mt-2 text-2xl font-bold">Select the 10–20 milestones that matter most</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">Startup and mentor selections stay proposed until the program team finalizes the plan. Existing milestones with activity cannot be removed.</p></div><form action={assignMilestonesAction} className="mt-5"><input type="hidden" name="startupId" value={id} /><div className="space-y-4">{Array.from(new Set(templates.map((item) => item.phase))).map((phase) => <details key={phase} className="overflow-hidden rounded-card border bg-white shadow-card"><summary className="cursor-pointer list-none border-b bg-prise-page px-5 py-4 text-sm font-semibold">Phase {phase} · {templates.find((item) => item.phase === phase)?.phaseName}</summary><div className="divide-y">{templates.filter((item) => item.phase === phase).map((template) => <label key={template.id} className="grid cursor-pointer grid-cols-[24px_1fr] gap-3 px-5 py-4 hover:bg-[#fbfbfe]"><input type="checkbox" name="templateId" value={template.id} defaultChecked={selected.has(template.id)} className="mt-1 h-4 w-4 accent-prise-primary" /><span><span className="block text-sm font-semibold">{template.title}</span><span className="mt-1 block text-xs leading-5 text-prise-text-secondary">{template.keyActivity} · Deliverable: {template.deliverable}</span></span></label>)}</div></details>)}</div><div className="sticky bottom-4 mt-5 flex items-center justify-between gap-4 rounded-card border bg-white/95 p-4 shadow-card backdrop-blur"><p className="text-sm text-prise-text-secondary">Choose 10–20. {program ? 'Saving finalizes the shared plan.' : 'Saving sends the plan for program confirmation.'}</p><SubmitButton>{program ? 'Finalize plan' : 'Save proposal'}</SubmitButton></div></form></div></div>;
}
