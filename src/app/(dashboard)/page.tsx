import { AlertCircle, Building2, ClipboardCheck, Library, Target, Users2 } from 'lucide-react';
import { OnboardingItemType, OnboardingStatus, StartupStatus } from '@prisma/client';
import {
  HeroSpotlightCard,
  QuickActionCard,
  StatCard,
  TodaysFocusCard,
  type FocusItem,
} from '@/components/ui/dashboard-widgets';
import { CohortChartCard, type WeeklyProgress } from '@/components/ui/CohortChartCard';
import { prisma } from '@/lib/prisma';
import { accessibleStartupWhere, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CORE_ONBOARDING = [
  OnboardingItemType.AGREEMENT,
  OnboardingItemType.BASELINE,
  OnboardingItemType.PITCH_VIDEO,
  OnboardingItemType.LOGO,
] as const;

const ITEM_LABEL: Record<(typeof CORE_ONBOARDING)[number], string> = {
  AGREEMENT: 'Agreement',
  BASELINE: 'Baseline',
  PITCH_VIDEO: 'Pitch',
  LOGO: 'Logo',
};

export default async function HomePage() {
  const session = await requireSession();
  const scope = accessibleStartupWhere(session.user);
  const [activeCount, selectedCount, attentionStartups, pendingCoreItems, templateCount, completionGroups] =
    await Promise.all([
      prisma.startup.count({ where: { ...scope, status: StartupStatus.ACTIVE } }),
      prisma.startup.count({ where: scope }),
      prisma.startup.findMany({
        where: {
          ...scope,
          status: StartupStatus.ACTIVE,
          onboardingItems: {
            some: { type: { in: [...CORE_ONBOARDING] }, status: OnboardingStatus.PENDING },
          },
        },
        select: {
          id: true,
          name: true,
          onboardingItems: {
            where: { type: { in: [...CORE_ONBOARDING] }, status: OnboardingStatus.PENDING },
            select: { type: true },
          },
        },
        orderBy: { sNo: 'asc' },
      }),
      prisma.onboardingItem.count({
        where: {
          startup: { ...scope, status: StartupStatus.ACTIVE },
          type: { in: [...CORE_ONBOARDING] },
          status: OnboardingStatus.PENDING,
        },
      }),
      prisma.milestoneTemplate.count({ where: { isActive: true } }),
      prisma.onboardingItem.findMany({
        where: {
          startup: { ...scope, status: StartupStatus.ACTIVE },
          type: { in: [...CORE_ONBOARDING] },
          status: { in: [OnboardingStatus.SUBMITTED, OnboardingStatus.APPROVED] },
        },
        select: { type: true },
      }),
    ]);

  const completedByType = new Map<(typeof CORE_ONBOARDING)[number], number>();
  for (const item of completionGroups) {
    const type = item.type as (typeof CORE_ONBOARDING)[number];
    completedByType.set(type, (completedByType.get(type) ?? 0) + 1);
  }
  const onboardingData: WeeklyProgress[] = CORE_ONBOARDING.map((type) => ({
    week: ITEM_LABEL[type],
    avgMilestonesComplete: activeCount === 0 ? 0 : Math.round(((completedByType.get(type) ?? 0) / activeCount) * 100),
  }));
  const overallOnboarding =
    activeCount === 0
      ? 0
      : Math.round(
          (completionGroups.length /
            (activeCount * CORE_ONBOARDING.length)) *
            100,
        );

  const focusItems: FocusItem[] = attentionStartups.slice(0, 4).map((startup) => ({
    icon: <AlertCircle size={16} className="text-danger" />,
    text: `${startup.name}: ${startup.onboardingItems.map((item) => ITEM_LABEL[item.type as keyof typeof ITEM_LABEL] ?? 'Onboarding item').join(', ')} pending`,
    href: `/startups/${startup.id}`,
  }));

  return (
    <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-prise-text sm:text-[28px]">Good morning, {session.user.name.split(' ')[0]}</h1>
        <p className="mt-1.5 text-sm text-prise-text-secondary">Here is what needs attention across PRISE 3.0 today.</p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={AlertCircle}
          value={attentionStartups.length}
          label="Need Attention"
          detail="Active startups missing core onboarding"
          tone="danger"
          href="/startups?filter=attention"
        />
        <StatCard
          icon={Building2}
          value={activeCount}
          label="Active Startups"
          detail={`${selectedCount} originally selected`}
          tone="info"
          href="/startups?filter=active"
        />
        <StatCard
          icon={ClipboardCheck}
          value={pendingCoreItems}
          label="Core Items Pending"
          detail="Agreement, baseline, pitch, or logo"
          tone="warning"
          href="/startups?filter=attention"
        />
        <StatCard
          icon={Library}
          value={templateCount}
          label="Milestone Library"
          detail="Across seven phases"
          tone="accent-purple"
          href="/milestones"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <HeroSpotlightCard
          title="PRISE 3.0"
          metricValue={`${activeCount} Active Startups`}
          metricLabel="Current operating cohort"
          progressPct={overallOnboarding}
          meta={`${overallOnboarding}% core onboarding complete`}
          ctaLabel="Open cohort"
          ctaHref="/startups"
        />
        <TodaysFocusCard items={focusItems} />
        <CohortChartCard
          title="Onboarding Completion"
          data={onboardingData}
          currentValue={overallOnboarding}
          changeLabel="active cohort"
        />
      </div>

      <section className="mt-7" aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="text-base font-semibold text-prise-text">Quick actions</h2>
        <p className="mb-4 mt-1 text-sm text-prise-text-secondary">Move directly into the core operating workflow.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard icon={Building2} title="Startups" subtitle="Open the cohort roster" tone="info" href="/startups" />
          <QuickActionCard icon={Target} title="Milestones" subtitle="Review the 52-item core library" tone="warning" href="/milestones" />
          <QuickActionCard icon={Users2} title="People" subtitle="Mentors, interns and experts" tone="accent-purple" href="/people" />
          <QuickActionCard icon={ClipboardCheck} title="Onboarding" subtitle="Resolve missing core items" tone="danger" href="/startups?filter=attention" />
        </div>
      </section>
    </div>
  );
}
