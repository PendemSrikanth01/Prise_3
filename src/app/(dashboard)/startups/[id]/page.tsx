import Link from 'next/link';
import { ArrowLeft, Check, Circle, IndianRupee, MapPin, Target } from 'lucide-react';
import { OnboardingStatus } from '@prisma/client';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ITEM_LABEL: Record<string, string> = {
  AGREEMENT: 'Agreement',
  BASELINE: 'Baseline assessment',
  PITCH_VIDEO: '2-minute pitch video',
  LOGO: 'Logo',
  FEE_PAYMENT: 'Fee payment',
  DOCUMENT_FOLDER: 'Document folder',
};

export default async function StartupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const startup = await prisma.startup.findUnique({
    where: { id },
    include: {
      onboardingItems: { orderBy: { type: 'asc' } },
      milestones: { orderBy: [{ phase: 'asc' }, { dueDate: 'asc' }] },
    },
  });
  if (!startup) notFound();

  const paid = Number(startup.totalFeePaid ?? 0);
  const agreed = Number(startup.agreedFee ?? 0);
  const feeProgress = agreed > 0 ? Math.min(100, Math.round((paid / agreed) * 100)) : 0;

  return (
    <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8">
      <Link href="/startups" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-prise-text-secondary hover:text-prise-primary">
        <ArrowLeft size={16} /> Back to startups
      </Link>

      <div className="rounded-card bg-prise-sidebar p-6 text-white shadow-card sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm text-white/55">PRISE 3.0 · Startup 360</div>
            <h1 className="mt-2 max-w-4xl text-2xl font-bold tracking-[-0.025em] sm:text-3xl">{startup.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/68">
              <span>{startup.founderName}</span>
              <span>{startup.sector}</span>
              {startup.operationLocation ? <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{startup.operationLocation}, {startup.state}</span> : null}
            </div>
          </div>
          <div className="rounded-button bg-white/9 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.08em] text-white/48">Operating status</div>
            <div className="mt-1 text-sm font-semibold">{startup.status.replaceAll('_', ' ')}</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-card border border-prise-border bg-white p-5 shadow-card sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-prise-text">Onboarding</h2>
              <p className="mt-1 text-sm text-prise-text-secondary">Source statuses imported from the tracker workbook.</p>
            </div>
          </div>
          <div className="divide-y divide-prise-border">
            {startup.onboardingItems.map((item) => {
              const complete = item.status === OnboardingStatus.SUBMITTED || item.status === OnboardingStatus.APPROVED;
              return (
                <div key={item.id} className="flex items-center gap-3 py-3.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${complete ? 'bg-success-bg text-success' : item.status === OnboardingStatus.NA ? 'bg-[#f0f0f4] text-prise-text-muted' : 'bg-warning-bg text-warning'}`}>
                    {complete ? <Check size={16} strokeWidth={2.5} /> : <Circle size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-prise-text">{ITEM_LABEL[item.type]}</div>
                    <div className="mt-0.5 text-xs text-prise-text-secondary">{item.status.replaceAll('_', ' ').toLowerCase()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-card border border-prise-border bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-2"><IndianRupee size={17} className="text-prise-primary" /><h2 className="text-base font-semibold">Fee position</h2></div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div><div className="text-3xl font-bold tracking-tight">₹{paid.toLocaleString('en-IN')}</div><div className="mt-1 text-xs text-prise-text-secondary">received</div></div>
              <div className="text-right text-sm text-prise-text-secondary">of {agreed ? `₹${agreed.toLocaleString('en-IN')}` : 'not set'}</div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-pill bg-[#ececf3]"><div className="h-full rounded-pill bg-success" style={{ width: `${feeProgress}%` }} /></div>
            {startup.agreedFeeRemarks ? <p className="mt-4 rounded-input bg-prise-page p-3 text-xs leading-5 text-prise-text-secondary">{startup.agreedFeeRemarks}</p> : null}
          </section>

          <section className="rounded-card border border-prise-border bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-2"><Target size={17} className="text-prise-primary" /><h2 className="text-base font-semibold">Milestone plan</h2></div>
            {startup.milestones.length === 0 ? (
              <div className="mt-5 rounded-input border border-dashed border-prise-border bg-prise-page p-5">
                <p className="text-sm font-medium text-prise-text">No startup milestones assigned yet</p>
                <p className="mt-1.5 text-xs leading-5 text-prise-text-secondary">This matches the source workbook. Select 10–15 relevant milestones jointly with the founder and mentor.</p>
                <Link href="/milestones" className="mt-4 inline-flex text-sm font-semibold text-prise-primary hover:text-prise-primary-hover">Open milestone library</Link>
              </div>
            ) : <div className="mt-4 text-sm text-prise-text-secondary">{startup.milestones.length} milestones assigned.</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
