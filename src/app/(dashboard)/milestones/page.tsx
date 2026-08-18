import { BookOpen, Building2, CircleDot } from 'lucide-react';
import { MilestoneScope, Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function MilestonesPage() {
  const session = await requireSession();
  if (session.user.role === Role.INVESTOR) redirect('/portfolio');
  const templates = await prisma.milestoneTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ phase: 'asc' }, { title: 'asc' }],
  });
  const phases = Array.from(new Set(templates.map((template) => template.phase))).map((phase) => ({
    phase,
    name: templates.find((template) => template.phase === phase)?.phaseName ?? `Phase ${phase}`,
    items: templates.filter((template) => template.phase === phase),
  }));
  const startupTemplates = templates.filter((template) => template.scope === MilestoneScope.STARTUP).length;
  const programTemplates = templates.length - startupTemplates;

  return (
    <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-prise-text sm:text-[28px]">Milestone library</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-prise-text-secondary">The 52 core records supplied in the real seed, separated between program-level work and startup-assignable milestones.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={BookOpen} value={templates.length} label="Core templates" />
        <SummaryCard icon={Building2} value={startupTemplates} label="Startup assignable" />
        <SummaryCard icon={CircleDot} value={programTemplates} label="Program level" />
      </div>

      <div className="mt-6 space-y-4">
        {phases.map((phase) => (
          <section key={phase.phase} className="overflow-hidden rounded-card border border-prise-border bg-white shadow-card">
            <div className="flex flex-col gap-2 border-b border-prise-border bg-[#fafafe] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="text-xs font-semibold uppercase tracking-[0.1em] text-prise-primary">Phase {phase.phase}</div><h2 className="mt-1 text-base font-semibold text-prise-text">{phase.name}</h2></div>
              <div className="text-sm text-prise-text-secondary">{phase.items.length} templates</div>
            </div>
            <div className="divide-y divide-prise-border">
              {phase.items.map((template) => (
                <div key={template.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(190px,.8fr)_minmax(260px,1.2fr)_minmax(220px,1fr)_110px] lg:items-start lg:gap-5">
                  <div><div className="text-sm font-semibold text-prise-text">{template.title}</div><span className={`mt-2 inline-flex rounded-pill px-2 py-0.5 text-[11px] font-semibold ${template.scope === MilestoneScope.PROGRAM ? 'bg-accent-purple-bg text-accent-purple' : 'bg-info-bg text-info'}`}>{template.scope === MilestoneScope.PROGRAM ? 'Program' : 'Startup'}</span></div>
                  <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-prise-text-muted">Key activity</div><p className="text-sm leading-5 text-prise-text-secondary">{template.keyActivity}</p></div>
                  <div><div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-prise-text-muted">Deliverable</div><p className="text-sm leading-5 text-prise-text-secondary">{template.deliverable}</p></div>
                  <div className="text-sm font-medium text-prise-text-secondary">{template.effort.toLowerCase()} effort</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, value, label }: { icon: typeof BookOpen; value: number; label: string }) {
  return <div className="rounded-card border border-prise-border bg-white p-5 shadow-card"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple-bg text-accent-purple"><Icon size={19} /></div><div className="mt-4 text-3xl font-bold tracking-tight text-prise-text">{value}</div><div className="mt-1 text-sm text-prise-text-secondary">{label}</div></div>;
}
