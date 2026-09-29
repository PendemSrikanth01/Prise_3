import { AssignmentRole, Role, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type MentorCoordination = Array<{
  startupId: string;
  startupName: string;
  isCoreMentor: boolean;
  programContacts: Array<{ id: string; name: string; email: string; role: Role }>;
}>;

export type MentorEngagement = {
  completedMeetings: number;
  messagesSent: number;
  activeConversations: number;
};

export async function mentorCoordinationAndEngagement(mentorId: string): Promise<{
  coordination: MentorCoordination;
  engagement: MentorEngagement;
}> {
  const [assignments, completedMeetings, messagesSent, activeConversations] = await Promise.all([
    prisma.startupAssignment.findMany({
      where: { personId: mentorId, role: AssignmentRole.MENTOR },
      orderBy: { startup: { name: 'asc' } },
      select: {
        isCoreMentor: true,
        startup: {
          select: {
            id: true,
            name: true,
            assignments: {
              where: {
                role: AssignmentRole.PROGRAM_LEAD,
                person: { isActive: true, role: { in: [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM] } },
              },
              orderBy: { person: { name: 'asc' } },
              select: { person: { select: { id: true, name: true, email: true, role: true } } },
            },
          },
        },
      },
    }),
    prisma.session.count({
      where: {
        status: SessionStatus.COMPLETED,
        OR: [{ facilitatorId: mentorId }, { participantIds: { has: mentorId } }],
      },
    }),
    prisma.mentorChatMessage.count({ where: { authorId: mentorId } }),
    prisma.mentorConversation.count({ where: { mentorId, messages: { some: {} } } }),
  ]);

  return {
    coordination: assignments.map((assignment) => ({
      startupId: assignment.startup.id,
      startupName: assignment.startup.name,
      isCoreMentor: assignment.isCoreMentor,
      programContacts: assignment.startup.assignments.map(({ person }) => person),
    })),
    engagement: { completedMeetings, messagesSent, activeConversations },
  };
}
