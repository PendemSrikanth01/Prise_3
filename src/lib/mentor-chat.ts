import 'server-only';

import { AssignmentRole, Role } from '@prisma/client';
import { isProgramRole, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function requireMentorChatPair(startupId: string, mentorId: string) {
  const session = await requireSession();
  const assignment = await prisma.startupAssignment.findFirst({
    where: { startupId, personId: mentorId, role: AssignmentRole.MENTOR, person: { role: Role.MENTOR, isActive: true } },
    select: {
      id: true,
      startup: {
        select: {
          id: true,
          name: true,
          founder: { select: { id: true, name: true, isActive: true } },
          memberships: { where: { isActive: true }, select: { person: { select: { id: true, name: true, isActive: true } } } },
        },
      },
      person: { select: { id: true, name: true, organization: true, designation: true } },
    },
  });
  if (!assignment) {
    if (!isProgramRole(session.user.role)) throw new Error('This mentor assignment is no longer active.');
    const archived = await prisma.mentorConversation.findUnique({
      where: { startupId_mentorId: { startupId, mentorId } },
      select: {
        id: true,
        startup: { select: { id: true, name: true } },
        mentor: { select: { id: true, name: true, organization: true, designation: true } },
      },
    });
    if (!archived) throw new Error('This mentoring conversation does not exist.');
    return { session, assignment: { id: archived.id, startup: archived.startup, person: archived.mentor }, startupPeople: [], canSend: false };
  }

  const startupPeople = [assignment.startup.founder, ...assignment.startup.memberships.map(({ person }) => person)]
    .filter((person): person is { id: string; name: string; isActive: boolean } => Boolean(person?.isActive));
  const startupPersonIds = new Set(startupPeople.map(({ id }) => id));
  const canRead = isProgramRole(session.user.role)
    || (session.user.role === Role.MENTOR && session.user.id === mentorId)
    || (session.user.role === Role.FOUNDER && startupPersonIds.has(session.user.id));
  if (!canRead) throw new Error('You do not have access to this mentoring conversation.');

  return {
    session,
    assignment,
    startupPeople: [...new Map(startupPeople.map((person) => [person.id, person])).values()],
    canSend: !isProgramRole(session.user.role),
  };
}
