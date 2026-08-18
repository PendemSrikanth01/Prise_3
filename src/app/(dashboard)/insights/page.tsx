import Link from 'next/link';
import { OnboardingStatus, SessionType, StartupStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { ProgramDashboardCharts, DashboardDataset } from '@/components/dashboard/ProgramDashboardCharts';
import { isProgramRole, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OFFICIAL_COHORT_WHERE } from '@/lib/startup-metrics';
import { attendanceSummary, groupValues, startupStatusLabel } from '@/lib/dashboard-metrics';

export const dynamic = 'force-dynamic';
type Tab = 'cohort' | 'compliance' | 'finance' | 'engagement';

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireSession();
  if (!isProgramRole(session.user.role)) redirect('/');
  const { tab: rawTab } = await searchParams;
  const tab: Tab = ['cohort','compliance','finance','engagement'].includes(rawTab ?? '') ? rawTab as Tab : 'cohort';
  const startups = await prisma.startup.findMany({
    where: OFFICIAL_COHORT_WHERE,
    orderBy: { sNo: 'asc' },
    include: {
      onboardingItems: { select: { type: true, status: true } },
      paymentInstallments: { select: { status: true } },
    },
  });
  const activeStatuses = new Set<StartupStatus>([StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION]);
  const activeIds = startups.filter((startup) => activeStatuses.has(startup.status)).map((startup) => startup.id);
  const attendance = await prisma.session.findMany({
    where: { externalEventId: { not: null } },
    orderBy: { startsAt: 'asc' },
    select: {
      title: true,
      type: true,
      startsAt: true,
      attendance: { where: { startupId: { in: activeIds } }, select: { mode: true } },
    },
  });

  const active = startups.filter((startup) => activeIds.includes(startup.id));
  const submitted = new Set<OnboardingStatus>([OnboardingStatus.SUBMITTED, OnboardingStatus.APPROVED]);
  const documentTypes = [
    ['Agreement', 'AGREEMENT'],
    ['Baseline form', 'BASELINE'],
    ['2 min pitch', 'PITCH_VIDEO'],
    ['Logo', 'LOGO'],
    ['Fee payment', 'FEE_PAYMENT'],
  ] as const;
  const feeExpected = active.reduce((sum, startup) => sum + Number(startup.agreedFee ?? 0), 0);
  const feeReceived = active.reduce((sum, startup) => sum + Number(startup.totalFeePaid ?? 0), 0);
  const dataset: DashboardDataset = {
    cohortStatus: groupValues(startups.map((startup) => startupStatusLabel(startup.status))),
    states: groupValues(active.map((startup) => startup.state ?? 'Not recorded')),
    sectors: groupValues(active.map((startup) => startup.sector ?? 'Not recorded')),
    legalStructures: groupValues(active.map((startup) => startup.legalStructure ?? 'Not recorded')),
    documents: documentTypes.map(([name, type]) => {
      const count = active.filter((startup) => startup.onboardingItems.some((item) => item.type === type && submitted.has(item.status))).length;
      return { name, submitted: count, pending: active.length - count };
    }),
    feeSummary: [
      { name: 'Expected', value: feeExpected },
      { name: 'Received', value: feeReceived },
      { name: 'Pending', value: Math.max(0, feeExpected - feeReceived) },
    ],
    agreedFee: groupValues(active.map((startup) => `₹${Number(startup.agreedFee ?? 0).toLocaleString('en-IN')}`)),
    eventAttendance: attendance.filter((event) => event.type !== SessionType.REVIEW).map(attendanceSummary),
    meetingAttendance: attendance.filter((event) => event.type === SessionType.REVIEW).map(attendanceSummary),
  };

  const tabs: Array<[Tab, string, string]> = [
    ['cohort', 'Cohort', '4 visuals'],
    ['compliance', 'Compliance', '1 visual'],
    ['finance', 'Finance', '2 visuals'],
    ['engagement', 'Engagement', '2 visuals'],
  ];
  return <div className="mx-auto w-full max-w-[1480px] p-4 sm:p-6 lg:p-8">
    <div><div className="text-xs font-semibold uppercase tracking-[.14em] text-prise-primary">PrISE 3.0 · Live analytics</div><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Program dashboard</h1><p className="mt-2 max-w-3xl text-sm text-prise-text-secondary">Nine operating visuals calculated from the reconciled official roster, onboarding records, fee data and per-startup attendance.</p></div>
    <nav className="mt-6 grid max-w-full grid-cols-4 gap-1 rounded-xl border bg-white p-1 shadow-card sm:flex sm:w-fit" aria-label="Dashboard sections">{tabs.map(([key,label,count]) => <Link key={key} href={`/insights?tab=${key}`} className={`whitespace-nowrap rounded-lg px-2 py-2 text-center text-[11px] font-semibold sm:px-4 sm:text-sm ${tab === key ? 'bg-prise-sidebar text-white' : 'text-prise-text-secondary hover:bg-prise-page'}`}>{label}<span className="ml-2 hidden text-[10px] opacity-70 sm:inline">{count}</span></Link>)}</nav>
    <ProgramDashboardCharts tab={tab} data={dataset} activeCount={active.length} />
  </div>;
}
