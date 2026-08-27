import Link from 'next/link';
import { CalendarDays, ChevronRight, LifeBuoy, Star, UsersRound, Video } from 'lucide-react';
import { MilestoneStatus, SessionStatus, SessionType, SupportRequestStatus, type Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type MentorUser = { id: string; name: string; role: Role };

export async function MentorDashboard({ user }: { user: MentorUser }) {
  const now = new Date();
  const startups = await prisma.startup.findMany({
    where: { assignments: { some: { personId: user.id } } },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      milestones: {
        orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, title: true, status: true, dueDate: true },
      },
    },
  });
  const startupIds = startups.map((startup) => startup.id);
  const [sessions, webinar, supportRequests, reviewsDue] = await Promise.all([
    prisma.session.findMany({
      where: {
        type: { not: SessionType.WORKSHOP },
        status: SessionStatus.SCHEDULED,
        startsAt: { gte: now },
        OR: [{ participantIds: { has: user.id } }, { startupId: { in: startupIds } }],
      },
      include: { startup: { select: { name: true } } },
      orderBy: { startsAt: 'asc' },
      take: 4,
    }),
    prisma.session.findFirst({
      where: { type: SessionType.WORKSHOP, status: SessionStatus.SCHEDULED, startsAt: { gte: now } },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.supportRequest.findMany({
      where: { startupId: { in: startupIds }, status: { in: [SupportRequestStatus.OPEN, SupportRequestStatus.ASSIGNED, SupportRequestStatus.IN_PROGRESS] } },
      include: { startup: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 4,
    }),
    prisma.milestone.count({ where: { startupId: { in: startupIds }, status: { in: [MilestoneStatus.SUBMITTED, MilestoneStatus.NEEDS_REVISION] } } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.025em] text-prise-text sm:text-[28px]">Good morning, {user.name.split(' ')[0]}</h1>
          <p className="mt-1.5 text-sm text-prise-text-secondary">Your mentees, sessions and reviews—one focused workspace.</p>
        </div>
        <Link href="/calendar" className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-prise-sidebar px-5 text-sm font-semibold text-white shadow-card transition hover:bg-[#201d4f]"><CalendarDays size={17} />Schedule session</Link>
      </div>

      <div className="mt-6 grid overflow-hidden rounded-card border border-prise-border bg-white shadow-card sm:grid-cols-3">
        <Metric icon={UsersRound} value={startups.length} label="My startups" />
        <Metric icon={CalendarDays} value={sessions.length} label="Upcoming sessions" />
        <Metric icon={Star} value={reviewsDue} label="Reviews due" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,.8fr)]">
        <div className="space-y-5">
          <Panel title="Upcoming sessions" href="/calendar">
            {sessions.length ? sessions.map((session) => (
              <div key={session.id} className="grid gap-3 border-t px-5 py-4 first:border-t-0 md:grid-cols-[92px_150px_1fr_auto] md:items-center">
                <div><div className="text-lg font-bold">{session.startsAt.toLocaleDateString('en-IN', { day: 'numeric', timeZone: 'Asia/Kolkata' })}</div><div className="text-xs text-prise-text-secondary">{session.startsAt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</div></div>
                <div className="text-sm font-medium">{session.startsAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</div>
                <div><div className="text-sm font-semibold">{session.startup?.name ?? 'Program session'}</div><div className="mt-1 line-clamp-1 text-xs text-prise-text-secondary">{session.title}</div></div>
                {session.meetingUrl ? <a href={session.meetingUrl} target="_blank" rel="noreferrer" className="rounded-button border px-3 py-2 text-center text-xs font-semibold text-prise-primary">Join session</a> : <Link href="/calendar" className="text-xs font-semibold text-prise-primary">Manage</Link>}
              </div>
            )) : <Empty text="No upcoming sessions. Schedule the next useful conversation." />}
          </Panel>

          <Panel title="My startups" href="/startups">
            {startups.length ? startups.map((startup) => {
              const complete = startup.milestones.filter((milestone) => milestone.status === MilestoneStatus.APPROVED).length;
              const total = startup.milestones.length;
              const progress = total ? Math.round((complete / total) * 100) : 0;
              const next = startup.milestones.find((milestone) => milestone.status !== MilestoneStatus.APPROVED);
              return <Link href={`/startups/${startup.id}`} key={startup.id} className="grid gap-3 border-t px-5 py-4 first:border-t-0 hover:bg-prise-page/70 md:grid-cols-[1.1fr_1.2fr_170px_1.2fr_20px] md:items-center"><div className="text-sm font-semibold">{startup.name}</div><div className="text-sm text-prise-text-secondary">{next?.title ?? 'Plan complete'}</div><div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-prise-page"><div className="h-full rounded-full bg-success" style={{ width: `${progress}%` }} /></div><span className="text-xs font-semibold">{progress}%</span></div><div className="text-sm font-medium text-prise-primary">{next ? 'Review next milestone' : 'View progress'}</div><ChevronRight size={16} className="text-prise-text-muted" /></Link>;
            }) : <Empty text="No startups are assigned yet. Ask the program lead to add your mentees." />}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Open tickets" href="/tickets">
            {supportRequests.length ? supportRequests.map((request) => <Link href="/tickets" key={request.id} className="block border-t px-5 py-4 first:border-t-0 hover:bg-prise-page/70"><div className="text-sm font-semibold">{request.title}</div><div className="mt-1 flex justify-between gap-3 text-xs text-prise-text-secondary"><span>{request.startup.name}</span><span>{request.status.replaceAll('_', ' ').toLowerCase()}</span></div></Link>) : <Empty text="No open tickets." compact />}
          </Panel>
          <Panel title="Upcoming workshop" href="/calendar">
            {webinar ? <div className="flex gap-4 px-5 py-5"><div className="w-14 shrink-0 border-r pr-4 text-center"><div className="text-2xl font-bold">{webinar.startsAt.toLocaleDateString('en-IN', { day: 'numeric', timeZone: 'Asia/Kolkata' })}</div><div className="text-xs text-prise-text-secondary">{webinar.startsAt.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })}</div></div><div className="min-w-0"><div className="text-xs font-medium text-prise-text-secondary">{webinar.startsAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</div><div className="mt-1 text-sm font-semibold">{webinar.title}</div><div className="mt-2 flex items-center gap-2 text-xs text-prise-primary"><Video size={14} />View details</div></div></div> : <Empty text="No webinar scheduled." compact />}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof UsersRound; value: number; label: string }) {
  return <div className="flex items-center justify-center gap-5 border-t border-prise-border px-5 py-6 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0"><Icon size={25} className="text-success" /><div><div className="text-2xl font-bold">{value}</div><div className="text-sm text-prise-text-secondary">{label}</div></div></div>;
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-card border border-prise-border bg-white shadow-card"><div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">{title}</h2><Link href={href} className="text-xs font-semibold text-prise-primary">View all</Link></div>{children}</section>;
}

function Empty({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`${compact ? 'px-5 py-6' : 'px-5 py-10'} text-center text-sm text-prise-text-secondary`}><LifeBuoy size={18} className="mx-auto mb-2 text-prise-text-muted" />{text}</div>;
}
