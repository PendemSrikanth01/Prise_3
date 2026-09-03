import Link from 'next/link';
import { MilestoneStatus, Role, SessionStatus, SupportRequestStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, LifeBuoy, UserRoundCheck, UsersRound } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { mentorAttention, mentorAttentionLabel, mentorAttentionReason, type MentorAttention } from '@/lib/mentor-metrics';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const attentionStyle: Record<MentorAttention, string> = {
  ON_TRACK: 'bg-success-bg text-success',
  NEEDS_REVIEW: 'bg-warning-bg text-warning',
  NEEDS_SUPPORT: 'bg-danger-bg text-danger',
  NEEDS_SESSION: 'bg-info-bg text-info',
  UNASSIGNED: 'bg-accent-purple-bg text-accent-purple',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

const validFilters = new Set(['all', 'attention', 'unassigned']);

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not yet';
}

export default async function MentorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireSession();
  if (auth.user.role !== Role.PROGRAM_LEAD && auth.user.role !== Role.PROGRAM_TEAM) redirect('/');
  const requestedFilter = (await searchParams).filter;
  const filter = typeof requestedFilter === 'string' && validFilters.has(requestedFilter) ? requestedFilter : 'all';
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [mentors, submittedMilestones] = await Promise.all([
    prisma.person.findMany({
      where: { role: Role.MENTOR, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        organization: true,
        designation: true,
        expertiseAreas: true,
        maxStartupCapacity: true,
        acceptingMentees: true,
        assignments: {
          where: { role: 'MENTOR' },
          orderBy: { startup: { name: 'asc' } },
          select: {
            startup: {
              select: {
                id: true,
                name: true,
                status: true,
                healthStatus: true,
                milestones: { where: { status: { not: MilestoneStatus.NA } }, select: { status: true } },
              },
            },
          },
        },
        facilitatedSessions: {
          orderBy: { startsAt: 'desc' },
          take: 100,
          select: { id: true, title: true, startsAt: true, status: true, startup: { select: { id: true, name: true } } },
        },
        assignedSupport: {
          where: { status: { in: [SupportRequestStatus.OPEN, SupportRequestStatus.ASSIGNED, SupportRequestStatus.IN_PROGRESS] } },
          orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
          select: { id: true, title: true, status: true, startup: { select: { id: true, name: true } } },
        },
        _count: { select: { milestoneReviews: true, reviewedDeliverables: true } },
      },
    }),
    prisma.milestone.findMany({
      where: { status: MilestoneStatus.SUBMITTED },
      select: { startupId: true },
    }),
  ]);

  const submittedByStartup = new Map<string, number>();
  submittedMilestones.forEach(({ startupId }) => submittedByStartup.set(startupId, (submittedByStartup.get(startupId) ?? 0) + 1));

  const rows = mentors.map((mentor) => {
    const assignedStartupIds = new Set(mentor.assignments.map(({ startup }) => startup.id));
    const pendingReviewCount = [...assignedStartupIds].reduce((total, startupId) => total + (submittedByStartup.get(startupId) ?? 0), 0);
    const upcomingSessions = mentor.facilitatedSessions
      .filter((session) => session.status === SessionStatus.SCHEDULED && session.startsAt >= now)
      .toSorted((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
    const completedSessions = mentor.facilitatedSessions.filter((session) => session.status === SessionStatus.COMPLETED);
    const completedThisMonth = completedSessions.filter((session) => session.startsAt >= monthStart).length;
    const signal = {
      isActive: mentor.isActive,
      assignedStartupCount: mentor.assignments.length,
      pendingReviewCount,
      openSupportCount: mentor.assignedSupport.length,
      hasUpcomingSession: upcomingSessions.length > 0,
    };
    const attention = mentorAttention(signal);
    return { ...mentor, pendingReviewCount, upcomingSessions, completedSessions, completedThisMonth, signal, attention };
  });

  const attentionCount = rows.filter((row) => !['ON_TRACK', 'UNASSIGNED', 'INACTIVE'].includes(row.attention)).length;
  const unassignedCount = rows.filter((row) => row.attention === 'UNASSIGNED').length;
  const activeCount = rows.filter((row) => row.isActive).length;
  const completedThisMonth = rows.reduce((total, row) => total + row.completedThisMonth, 0);
  const visibleRows = rows.filter((row) => {
    if (filter === 'attention') return !['ON_TRACK', 'UNASSIGNED', 'INACTIVE'].includes(row.attention);
    if (filter === 'unassigned') return row.attention === 'UNASSIGNED';
    return true;
  });

  const cards = [
    { label: 'Active mentors', value: activeCount, icon: UsersRound, href: '/mentors', tone: 'text-prise-primary bg-accent-purple-bg' },
    { label: 'Need attention', value: attentionCount, icon: LifeBuoy, href: '/mentors?filter=attention', tone: 'text-danger bg-danger-bg' },
    { label: 'Available to assign', value: unassignedCount, icon: UserRoundCheck, href: '/mentors?filter=unassigned', tone: 'text-info bg-info-bg' },
    { label: 'Sessions this month', value: completedThisMonth, icon: CalendarDays, href: '/calendar', tone: 'text-success bg-success-bg' },
  ];

  return <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">People & program</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Mentors</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-prise-text-secondary">See who supports each startup, what mentors have completed and where the program team should step in next.</p></div>
      <Link href="/calendar" className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-prise-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-prise-primary-hover">Open calendar <ArrowRight size={16} /></Link>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, href, tone }) => <Link key={label} href={href} className="group rounded-card border bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-sm text-prise-text-secondary">{label}</div></div><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={19} /></div></div></Link>)}</div>

    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold">Mentor directory</h2>
      <div className="max-w-full overflow-x-auto rounded-xl border bg-white p-1 text-sm"><div className="flex w-max">{[
        ['all', 'All'], ['attention', 'Needs attention'], ['unassigned', 'Unassigned'],
      ].map(([value, label]) => <Link key={value} href={value === 'all' ? '/mentors' : `/mentors?filter=${value}`} className={`whitespace-nowrap rounded-lg px-3 py-2 font-medium ${filter === value ? 'bg-prise-sidebar text-white' : 'text-prise-text-secondary hover:bg-prise-page'}`}>{label}</Link>)}</div></div>
    </div>

    <div className="mt-4 space-y-3">{visibleRows.map((mentor) => {
      const lastCompleted = mentor.completedSessions[0];
      const totalMilestones = mentor.assignments.reduce((total, { startup }) => total + startup.milestones.length, 0);
      const approvedMilestones = mentor.assignments.reduce((total, { startup }) => total + startup.milestones.filter(({ status }) => status === MilestoneStatus.APPROVED).length, 0);
      return <details key={mentor.id} className="group overflow-hidden rounded-card border bg-white shadow-card">
        <summary className="grid cursor-pointer list-none gap-4 p-5 md:grid-cols-[minmax(220px,1fr)_110px_110px_150px] md:items-center">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-purple-bg text-sm font-bold text-accent-purple">{mentor.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div className="min-w-0"><div className="truncate font-semibold">{mentor.name}</div><div className="truncate text-xs text-prise-text-secondary">{mentor.email}</div></div></div>
          <div><div className="text-lg font-bold">{mentor.assignments.length}</div><div className="text-xs text-prise-text-secondary">Startups</div></div>
          <div><div className="text-lg font-bold">{mentor.pendingReviewCount}</div><div className="text-xs text-prise-text-secondary">Reviews waiting</div></div>
          <div><span className={`inline-flex rounded-pill px-2.5 py-1 text-xs font-semibold ${attentionStyle[mentor.attention]}`}>{mentorAttentionLabel(mentor.attention)}</span><p className="mt-1.5 text-xs leading-5 text-prise-text-secondary">{mentorAttentionReason(mentor.signal, mentor.attention)}</p></div>
        </summary>

        <div className="border-t bg-[#fbfbfe] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-semibold">{mentor.designation || 'Mentor'}{mentor.organization ? ` · ${mentor.organization}` : ''}</div><div className="mt-1 text-xs text-prise-text-secondary">{mentor.expertiseAreas.length ? mentor.expertiseAreas.join(' · ') : 'Expertise profile not completed'} · {mentor.assignments.length}/{mentor.maxStartupCapacity} startup capacity</div></div><Link href={`/mentors/${mentor.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button border px-4 text-sm font-semibold text-prise-primary hover:bg-accent-purple-bg">Manage profile <ArrowRight size={15} /></Link></div>
          <div className="grid gap-4 lg:grid-cols-[1.35fr_.9fr]">
            <section className="rounded-card border bg-white p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Assigned startups</h3><span className="text-xs text-prise-text-secondary">{approvedMilestones}/{totalMilestones} milestones approved</span></div><div className="mt-3 divide-y">{mentor.assignments.map(({ startup }) => {
              const approved = startup.milestones.filter(({ status }) => status === MilestoneStatus.APPROVED).length;
              const progress = startup.milestones.length ? Math.round((approved / startup.milestones.length) * 100) : 0;
              return <Link key={startup.id} href={`/startups/${startup.id}`} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{startup.name}</div><div className="mt-1 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-prise-page"><div className="h-full rounded-full bg-prise-primary" style={{ width: `${progress}%` }} /></div><span className="text-xs font-medium text-prise-text-secondary">{progress}%</span></div></div><ArrowRight size={16} className="text-prise-text-muted" /></Link>;
            })}{mentor.assignments.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-center"><p className="text-sm text-prise-text-secondary">No startup assignment yet.</p><Link href="/startups" className="mt-2 inline-block text-sm font-semibold text-prise-primary">Choose a startup to assign →</Link></div> : null}</div></section>

            <section className="rounded-card border bg-white p-4"><h3 className="font-semibold">Activity & capacity</h3><dl className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl bg-prise-page p-3"><dt className="text-xs text-prise-text-secondary">Next session</dt><dd className="mt-1 text-sm font-semibold">{formatDate(mentor.upcomingSessions[0]?.startsAt)}</dd></div><div className="rounded-xl bg-prise-page p-3"><dt className="text-xs text-prise-text-secondary">Last session</dt><dd className="mt-1 text-sm font-semibold">{formatDate(lastCompleted?.startsAt)}</dd></div><div className="rounded-xl bg-prise-page p-3"><dt className="text-xs text-prise-text-secondary">Milestone reviews</dt><dd className="mt-1 text-sm font-semibold">{mentor._count.milestoneReviews}</dd></div><div className="rounded-xl bg-prise-page p-3"><dt className="text-xs text-prise-text-secondary">Evidence reviews</dt><dd className="mt-1 text-sm font-semibold">{mentor._count.reviewedDeliverables}</dd></div></dl></section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-card border bg-white p-4"><div className="flex items-center gap-2"><CalendarDays size={17} className="text-prise-primary" /><h3 className="font-semibold">Upcoming work</h3></div><div className="mt-3 space-y-2">{mentor.upcomingSessions.slice(0, 3).map((session) => <Link key={session.id} href="/calendar" className="flex items-center justify-between rounded-xl bg-prise-page px-3 py-2.5"><div><div className="text-sm font-medium">{session.startup?.name ?? session.title}</div><div className="mt-0.5 text-xs text-prise-text-secondary">{session.startsAt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div></div><ArrowRight size={15} className="text-prise-text-muted" /></Link>)}{mentor.upcomingSessions.length === 0 ? <Link href="/calendar" className="flex items-center justify-between rounded-xl border border-dashed px-3 py-3 text-sm font-medium text-prise-primary">Schedule the next session <ArrowRight size={15} /></Link> : null}{mentor.pendingReviewCount > 0 ? <Link href="/reviews" className="flex items-center justify-between rounded-xl bg-warning-bg px-3 py-3 text-sm font-medium text-warning"><span className="flex items-center gap-2"><ClipboardCheck size={16} />{mentor.pendingReviewCount} milestone reviews waiting</span><ArrowRight size={15} /></Link> : null}</div></section>

            <section className="rounded-card border bg-white p-4"><div className="flex items-center gap-2"><LifeBuoy size={17} className="text-prise-primary" /><h3 className="font-semibold">Mentor needs</h3></div><div className="mt-3 space-y-2">{mentor.assignedSupport.slice(0, 3).map((request) => <Link key={request.id} href="/support" className="flex items-center justify-between rounded-xl bg-danger-bg px-3 py-2.5"><div><div className="text-sm font-medium text-danger">{request.title}</div><div className="mt-0.5 text-xs text-danger/75">{request.startup.name} · {request.status.replaceAll('_', ' ').toLowerCase()}</div></div><ArrowRight size={15} className="text-danger" /></Link>)}{mentor.assignedSupport.length === 0 ? <div className="flex items-center gap-2 rounded-xl bg-success-bg px-3 py-3 text-sm text-success"><CheckCircle2 size={16} />No open support requests</div> : null}</div></section>
          </div>
        </div>
      </details>;
    })}{visibleRows.length === 0 ? <div className="rounded-card border border-dashed bg-white p-12 text-center"><h3 className="font-semibold">No mentors in this view</h3><p className="mt-2 text-sm text-prise-text-secondary">Try another filter or create mentor accounts in Administration.</p></div> : null}</div>
  </div>;
}
