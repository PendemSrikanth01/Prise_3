import { Role, SessionType } from '@prisma/client';
import { redirect } from 'next/navigation';
import { CalendarView } from '@/components/calendar/CalendarView';
import { accessibleStartupWhere, hasPermission, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const auth = await requireSession();
  if (auth.user.role === Role.INVESTOR) redirect('/portfolio');
  const startupScope = accessibleStartupWhere(auth.user);
  const isProgram = auth.user.role === Role.PROGRAM_LEAD || auth.user.role === Role.PROGRAM_TEAM;
  const canManageSessions = hasPermission(auth.user.role, 'session:manage');
  const canManageWebinars = hasPermission(auth.user.role, 'webinar:manage');
  const [sessions, startups, facilitators] = await Promise.all([
    prisma.session.findMany({
      where: isProgram ? {} : {
        OR: [
          { isCohortWide: true, type: SessionType.WORKSHOP },
          { participantIds: { has: auth.user.id } },
          { startup: startupScope },
        ],
      },
      include: { startup: { select: { name: true } }, facilitator: { select: { name: true } } },
      orderBy: { startsAt: 'asc' },
      take: 500,
    }),
    prisma.startup.findMany({ where: startupScope, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    isProgram
      ? prisma.person.findMany({ where: { isActive: true, role: { in: [Role.MENTOR, Role.PROGRAM_LEAD, Role.PROGRAM_TEAM, Role.EXPERT] } }, orderBy: { name: 'asc' }, select: { id: true, name: true, role: true } })
      : Promise.resolve([]),
  ]);

  return <CalendarView
    events={sessions.map((session) => ({
      id: session.id,
      title: session.title,
      description: session.description,
      type: session.type,
      status: session.status,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt?.toISOString() ?? null,
      meetingUrl: session.meetingUrl,
      outcome: session.outcome,
      nextActions: session.nextActions,
      startupName: session.startup?.name ?? null,
      facilitatorName: session.facilitator?.name ?? null,
    }))}
    startups={startups}
    facilitators={facilitators}
    canManageSessions={canManageSessions}
    canManageWebinars={canManageWebinars}
  />;
}
