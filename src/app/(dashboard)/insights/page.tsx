import { PageIntro } from '@/components/ui/PageIntro';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const sectors = await prisma.startup.groupBy({ by: ['sector'], _count: { _all: true }, orderBy: { _count: { sector: 'desc' } } });
  return <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8"><PageIntro title="Insights" description="Source-backed cohort composition. Outcome and milestone analytics will appear only after real operating data exists." /><div className="mt-6 rounded-card border border-prise-border bg-white p-5 shadow-card sm:p-6"><h2 className="text-base font-semibold">Sector distribution</h2><div className="mt-5 space-y-4">{sectors.map((sector) => <div key={sector.sector ?? 'Unknown'} className="flex items-center justify-between gap-4"><span className="text-sm text-prise-text-secondary">{sector.sector ?? 'Unknown'}</span><span className="rounded-pill bg-info-bg px-2.5 py-1 text-xs font-semibold text-info">{sector._count._all}</span></div>)}</div></div></div>;
}
