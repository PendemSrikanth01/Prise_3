import { Role, SessionType } from '@prisma/client';
import { redirect } from 'next/navigation';
import { CalendarView } from '@/components/calendar/CalendarView';
import { accessibleStartupWhere, hasPermission, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { googleCalendarConfigured } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const auth = await requireSession();
  if (auth.user.role === Role.INVESTOR) redirect('/portfolio');
  const startupScope = accessibleStartupWhere(auth.user);
  const isProgram = auth.user.role === Role.PROGRAM_LEAD || auth.user.role === Role.PROGRAM_TEAM;
  const canManageSessions = hasPermission(auth.user.role, 'session:manage');
  const canManageWebinars = hasPermission(auth.user.role, 'webinar:manage');
  const googleConfigured = googleCalendarConfigured();
  const calendarScope = isProgram
    ? {}
    : auth.user.role === Role.MENTOR
      ? { facilitatorId: auth.user.id }
      : {
          OR: [
            { isCohortWide: true, type: SessionType.WORKSHOP },
            { participantIds: { has: auth.user.id } },
            { startup: startupScope },
          ],
        };
  const [sessions, startups, facilitators, googleConnection] = await Promise.all([
    prisma.session.findMany({
      where: calendarScope,
      include: { startup: { select: { name: true } }, facilitator: { select: { name: true } }, attendance: { where: { startup: startupScope }, include: { startup: { select: { name: true } } }, orderBy: { startup: { name: 'asc' } } } },
      orderBy: { startsAt: 'asc' },
      take: 500,
    }),
    prisma.startup.findMany({
      where: startupScope,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        founder: { select: { id: true, name: true, role: true } },
        memberships: {
          where: { isActive: true, person: { isActive: true } },
          select: { role: true, person: { select: { id: true, name: true, role: true } } },
        },
        assignments: {
          where: { person: { isActive: true } },
          select: { role: true, person: { select: { id: true, name: true, role: true } } },
        },
      },
    }),
    isProgram
      ? prisma.person.findMany({ where: { isActive: true, role: { in: [Role.MENTOR, Role.PROGRAM_LEAD, Role.PROGRAM_TEAM, Role.EXPERT] } }, orderBy: { name: 'asc' }, select: { id: true, name: true, role: true } })
      : Promise.resolve([]),
    (canManageSessions || canManageWebinars) && googleConfigured
      ? prisma.googleCalendarConnection.findUnique({ where: { personId: auth.user.id }, select: { googleAccountEmail: true } })
      : Promise.resolve(null),
  ]);
  const googleStatus = (await searchParams).google;
  const startupParticipants = startups.map((startup) => {
    const people = new Map<string, { id: string; name: string; role: string; defaultSelected: boolean }>();
    if (startup.founder) people.set(startup.founder.id, { id: startup.founder.id, name: startup.founder.name, role: 'Founder', defaultSelected: true });
    for (const membership of startup.memberships) {
      people.set(membership.person.id, { id: membership.person.id, name: membership.person.name, role: membership.role.replaceAll('_', ' ').toLowerCase(), defaultSelected: true });
    }
    for (const assignment of startup.assignments) {
      if (!people.has(assignment.person.id)) people.set(assignment.person.id, { id: assignment.person.id, name: assignment.person.name, role: assignment.role.replaceAll('_', ' ').toLowerCase(), defaultSelected: false });
    }
    return { startupId: startup.id, people: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)) };
  });

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
      externalEventId: session.externalEventId,
      calendarSyncStatus: session.calendarSyncStatus,
      calendarSyncError: session.calendarSyncError,
      outcome: session.outcome,
      nextActions: session.nextActions,
      insights: session.insights,
      learnings: session.learnings,
      decisions: session.decisions,
      followUpAt: session.followUpAt?.toISOString() ?? null,
      recurrenceGroupId: session.recurrenceGroupId,
      startupName: session.startup?.name ?? null,
      facilitatorName: session.facilitator?.name ?? null,
      attendance: session.attendance,
    }))}
    startups={startups.map(({ id, name }) => ({ id, name }))}
    startupParticipants={startupParticipants}
    facilitators={facilitators}
    canManageSessions={canManageSessions}
    canManageWebinars={canManageWebinars}
    canManageAttendance={isProgram}
    googleCalendar={{ configured: googleConfigured, connectedEmail: googleConnection?.googleAccountEmail ?? null, status: googleStatus ?? null }}
  />;
}
