import { EmptyPanel, PageIntro } from '@/components/ui/PageIntro';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function WorkPage() {
  const [tasks, requests] = await Promise.all([prisma.task.count(), prisma.supportRequest.count()]);
  return <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8"><PageIntro title="Work" description="Milestone-linked tasks and support requests will be coordinated here." /><div className="mt-6 grid gap-4 sm:grid-cols-2"><Metric value={tasks} label="Tasks" /><Metric value={requests} label="Support requests" /></div>{tasks + requests === 0 ? <EmptyPanel title="No operational work has been created yet" description="This is expected: the supplied workbook contains the cohort and milestone library, but no real task or support-request history." /> : null}</div>;
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="rounded-card border border-prise-border bg-white p-5 shadow-card"><div className="text-3xl font-bold">{value}</div><div className="mt-1 text-sm text-prise-text-secondary">{label}</div></div>; }
