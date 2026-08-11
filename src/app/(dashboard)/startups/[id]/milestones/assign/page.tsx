import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MilestoneScope } from '@prisma/client';
import { assignMilestonesAction } from '@/app/actions/workflows';
import { SubmitButton } from '@/components/ui/FormButtons';
import { accessibleStartupWhere, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AssignMilestonesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('milestone:assign');
  const { id } = await params;
  const [startup, templates, assigned] = await Promise.all([
    prisma.startup.findFirst({ where: { id, ...accessibleStartupWhere(session.user) }, select: { id: true, name: true } }),
    prisma.milestoneTemplate.findMany({ where: { isActive: true, scope: MilestoneScope.STARTUP }, orderBy: [{ phase: 'asc' }, { title: 'asc' }] }),
    prisma.milestone.findMany({ where: { startupId: id, templateId: { not: null } }, select: { templateId: true } }),
  ]);
  if (!startup) notFound();
  const selected = new Set(assigned.flatMap((item) => item.templateId ? [item.templateId] : []));
  return <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8"><Link href={`/startups/${id}`} className="text-sm font-semibold text-prise-primary">← {startup.name}</Link><div className="mt-5"><div className="rounded-card bg-prise-sidebar p-6 text-white"><p className="text-sm text-white/55">Joint founder + mentor planning</p><h1 className="mt-2 text-2xl font-bold">Select the 10–15 outcomes that matter most</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">A smaller committed plan beats a large passive checklist. Existing milestones with work or reviews cannot be removed.</p></div><form action={assignMilestonesAction} className="mt-5"><input type="hidden" name="startupId" value={id} /><div className="space-y-4">{Array.from(new Set(templates.map((item) => item.phase))).map((phase) => <section key={phase} className="overflow-hidden rounded-card border bg-white shadow-card"><div className="border-b bg-prise-page px-5 py-3 text-sm font-semibold">Phase {phase} · {templates.find((item) => item.phase === phase)?.phaseName}</div><div className="divide-y">{templates.filter((item) => item.phase === phase).map((template) => <label key={template.id} className="grid cursor-pointer grid-cols-[24px_1fr] gap-3 px-5 py-4 hover:bg-[#fbfbfe]"><input type="checkbox" name="templateId" value={template.id} defaultChecked={selected.has(template.id)} className="mt-1 h-4 w-4 accent-prise-primary" /><span><span className="block text-sm font-semibold">{template.title}</span><span className="mt-1 block text-xs leading-5 text-prise-text-secondary">{template.keyActivity} · Deliverable: {template.deliverable}</span></span></label>)}</div></section>)}</div><div className="sticky bottom-4 mt-5 flex items-center justify-between rounded-card border bg-white/95 p-4 shadow-card backdrop-blur"><p className="text-sm text-prise-text-secondary">Choose 10–15. The server enforces the limit.</p><SubmitButton>Save milestone plan</SubmitButton></div></form></div></div>;
}
