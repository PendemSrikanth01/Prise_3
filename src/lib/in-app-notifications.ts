import { InAppNotificationKind, type Prisma } from '@prisma/client';

type PersonRef = { id: string; name: string };
type StartupRef = { id: string; name: string };

export function mentorMappingNotificationRows(input: {
  changeId: string;
  startup: StartupRef;
  startupRecipients: PersonRef[];
  addedMentors: PersonRef[];
  removedMentors: PersonRef[];
}): Prisma.InAppNotificationCreateManyInput[] {
  const startupRecipients = [...new Map(input.startupRecipients.map((person) => [person.id, person])).values()];
  const rows: Prisma.InAppNotificationCreateManyInput[] = [];

  for (const mentor of input.addedMentors) {
    rows.push({
      recipientId: mentor.id,
      kind: InAppNotificationKind.MENTOR_MAPPING_ADDED,
      title: 'New startup assigned',
      message: `You have been assigned as a mentor to ${input.startup.name}.`,
      href: `/startups/${input.startup.id}`,
      relatedEntityType: 'StartupAssignment',
      relatedEntityId: input.startup.id,
      eventKey: `${input.changeId}:added:mentor:${mentor.id}`,
    });
    for (const recipient of startupRecipients) rows.push({
      recipientId: recipient.id,
      kind: InAppNotificationKind.MENTOR_MAPPING_ADDED,
      title: 'Mentor assignment confirmed',
      message: `${mentor.name} has been assigned as a mentor to ${input.startup.name}.`,
      href: `/startups/${input.startup.id}`,
      relatedEntityType: 'StartupAssignment',
      relatedEntityId: input.startup.id,
      eventKey: `${input.changeId}:added:startup:${recipient.id}:mentor:${mentor.id}`,
    });
  }

  for (const mentor of input.removedMentors) {
    rows.push({
      recipientId: mentor.id,
      kind: InAppNotificationKind.MENTOR_MAPPING_REMOVED,
      title: 'Startup assignment updated',
      message: `You are no longer assigned as a mentor to ${input.startup.name}.`,
      href: '/directory',
      relatedEntityType: 'StartupAssignment',
      relatedEntityId: input.startup.id,
      eventKey: `${input.changeId}:removed:mentor:${mentor.id}`,
    });
    for (const recipient of startupRecipients) rows.push({
      recipientId: recipient.id,
      kind: InAppNotificationKind.MENTOR_MAPPING_REMOVED,
      title: 'Mentor assignment updated',
      message: `${mentor.name} is no longer assigned as a mentor to ${input.startup.name}.`,
      href: `/startups/${input.startup.id}`,
      relatedEntityType: 'StartupAssignment',
      relatedEntityId: input.startup.id,
      eventKey: `${input.changeId}:removed:startup:${recipient.id}:mentor:${mentor.id}`,
    });
  }

  return rows;
}

export function mentorChatNotificationRows(input: {
  messageId: string;
  conversationId: string;
  startupId: string;
  startupName: string;
  mentorId: string;
  mentorName: string;
  authorId: string;
  authorName: string;
  startupRecipients: PersonRef[];
}): Prisma.InAppNotificationCreateManyInput[] {
  const recipients = input.authorId === input.mentorId
    ? input.startupRecipients
    : [{ id: input.mentorId, name: input.mentorName }];
  const uniqueRecipients = [...new Map(recipients.filter(({ id }) => id !== input.authorId).map((person) => [person.id, person])).values()];
  const href = `/messages/${input.startupId}/${input.mentorId}`;

  return uniqueRecipients.map((recipient) => ({
    recipientId: recipient.id,
    kind: InAppNotificationKind.CHAT_MESSAGE,
    title: `New message from ${input.authorName}`,
    message: `Open the mentoring conversation for ${input.startupName}.`,
    href,
    relatedEntityType: 'MentorConversation',
    relatedEntityId: input.conversationId,
    eventKey: `mentor-chat:${input.messageId}:${recipient.id}`,
  }));
}
