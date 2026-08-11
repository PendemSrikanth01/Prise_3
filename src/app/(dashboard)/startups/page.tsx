import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';
import { OnboardingItemType, OnboardingStatus, Prisma, StartupStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const CORE_TYPES = [
  OnboardingItemType.AGREEMENT,
  OnboardingItemType.BASELINE,
  OnboardingItemType.PITCH_VIDEO,
  OnboardingItemType.LOGO,
] as const;

type SearchParams = Promise<{ q?: string; filter?: string }>;

function statusStyle(status: StartupStatus) {
  if (status === StartupStatus.ACTIVE) return 'bg-success-bg text-success';
  if (status === StartupStatus.WITHDRAWN) return 'bg-warning-bg text-warning';
  return 'bg-[#f0f0f4] text-prise-text-secondary';
}

function statusLabel(status: StartupStatus) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export default async function StartupsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = '', filter = 'all' } = await searchParams;
  const search = q.trim();
  const where: Prisma.StartupWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { founderName: { contains: search, mode: 'insensitive' } },
      { sector: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (filter === 'active') where.status = StartupStatus.ACTIVE;
  if (filter === 'inactive') where.status = { in: [StartupStatus.DISCONTINUED, StartupStatus.WITHDRAWN] };
  if (filter === 'attention') {
    where.status = StartupStatus.ACTIVE;
    where.onboardingItems = {
      some: { type: { in: [...CORE_TYPES] }, status: OnboardingStatus.PENDING },
    };
  }

  const [startups, counts] = await Promise.all([
    prisma.startup.findMany({
      where,
      orderBy: { sNo: 'asc' },
      select: {
        id: true,
        sNo: true,
        name: true,
        founderName: true,
        sector: true,
        state: true,
        status: true,
        agreedFee: true,
        totalFeePaid: true,
        onboardingItems: {
          where: { type: { in: [...CORE_TYPES] } },
          select: { status: true },
        },
      },
    }),
    Promise.all([
      prisma.startup.count(),
      prisma.startup.count({ where: { status: StartupStatus.ACTIVE } }),
      prisma.startup.count({ where: { status: { in: [StartupStatus.DISCONTINUED, StartupStatus.WITHDRAWN] } } }),
      prisma.startup.count({
        where: {
          status: StartupStatus.ACTIVE,
          onboardingItems: { some: { type: { in: [...CORE_TYPES] }, status: OnboardingStatus.PENDING } },
        },
      }),
    ]),
  ]);

  const filterLinks = [
    { id: 'all', label: 'All', count: counts[0] },
    { id: 'active', label: 'Active', count: counts[1] },
    { id: 'attention', label: 'Needs attention', count: counts[3] },
    { id: 'inactive', label: 'Inactive', count: counts[2] },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em] text-prise-text sm:text-[28px]">Startups</h1>
          <p className="mt-1.5 text-sm text-prise-text-secondary">The real PRISE 3.0 roster and onboarding position.</p>
        </div>
        <form className="flex h-11 w-full items-center gap-2 rounded-pill border border-prise-border bg-white px-4 shadow-sm sm:w-80">
          <Search size={16} className="text-prise-text-muted" />
          <input
            name="q"
            defaultValue={search}
            placeholder="Search name, founder, sector…"
            aria-label="Search startups"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-prise-text-muted"
          />
        </form>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {filterLinks.map((item) => (
          <Link
            key={item.id}
            href={`/startups?filter=${item.id}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`whitespace-nowrap rounded-pill px-3.5 py-2 text-sm font-medium transition-colors ${
              filter === item.id ? 'bg-prise-sidebar text-white' : 'border border-prise-border bg-white text-prise-text-secondary hover:bg-prise-page'
            }`}
          >
            {item.label} <span className="ml-1 opacity-65">{item.count}</span>
          </Link>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-card border border-prise-border bg-white shadow-card">
        <div className="hidden grid-cols-[56px_minmax(250px,1.5fr)_minmax(160px,1fr)_minmax(130px,.8fr)_130px_140px_32px] gap-4 border-b bg-[#fafafe] px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-prise-text-muted lg:grid">
          <span>No.</span><span>Startup</span><span>Sector</span><span>Status</span><span>Onboarding</span><span>Fee paid</span><span />
        </div>
        <div className="divide-y divide-prise-border">
          {startups.map((startup) => {
            const completed = startup.onboardingItems.filter(
              (item) => item.status === OnboardingStatus.SUBMITTED || item.status === OnboardingStatus.APPROVED,
            ).length;
            const onboardingPct = Math.round((completed / CORE_TYPES.length) * 100);
            const paid = Number(startup.totalFeePaid ?? 0);
            const agreed = Number(startup.agreedFee ?? 0);
            return (
              <Link
                key={startup.id}
                href={`/startups/${startup.id}`}
                className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#fbfbfe] lg:grid-cols-[56px_minmax(250px,1.5fr)_minmax(160px,1fr)_minmax(130px,.8fr)_130px_140px_32px] lg:items-center lg:gap-4"
              >
                <span className="hidden text-sm tabular-nums text-prise-text-muted lg:block">{startup.sNo}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-prise-text">{startup.name}</div>
                  <div className="mt-1 truncate text-xs text-prise-text-secondary">{startup.founderName} · {startup.state}</div>
                </div>
                <div className="text-sm text-prise-text-secondary">{startup.sector}</div>
                <div><span className={`inline-flex rounded-pill px-2.5 py-1 text-xs font-semibold ${statusStyle(startup.status)}`}>{statusLabel(startup.status)}</span></div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-prise-text-secondary"><span>Core items</span><span>{onboardingPct}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-pill bg-[#ececf3]"><div className="h-full rounded-pill bg-prise-primary" style={{ width: `${onboardingPct}%` }} /></div>
                </div>
                <div className="text-sm tabular-nums text-prise-text-secondary">₹{paid.toLocaleString('en-IN')}<span className="text-prise-text-muted"> / {agreed ? `₹${agreed.toLocaleString('en-IN')}` : '—'}</span></div>
                <ChevronRight size={17} className="hidden text-prise-text-muted lg:block" />
              </Link>
            );
          })}
          {startups.length === 0 ? <div className="px-6 py-16 text-center text-sm text-prise-text-secondary">No startups match this view.</div> : null}
        </div>
      </div>
    </div>
  );
}
