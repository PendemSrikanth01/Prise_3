'use server';

import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { requiredText } from '@/lib/form';
import { mentorChatNotificationRows } from '@/lib/in-app-notifications';
import { requireMentorChatPair } from '@/lib/mentor-chat';
import { prisma } from '@/lib/prisma';
import { deliverPushForNotificationIds } from '@/lib/push-notifications';
import { emailDeliveryConfigured, renderOrganizationEmail, sendQueuedEmailMessage } from '@/lib/email';
import { priseTeamEmails } from '@/lib/prise-team';

export type ChatFeedback = { status: 'idle' | 'success' | 'error'; message: string };

export async function sendMentorMessageAction(_previous: ChatFeedback, formData: FormData): Promise<ChatFeedback> {
  try {
    const startupId = requiredText(formData, 'startupId', 64);
    const mentorId = requiredText(formData, 'mentorId', 64);
    const body = requiredText(formData, 'body', 3000);
    const notifyPriseTeam = formData.get('notifyPriseTeam') === 'on';
    const teamEmails = notifyPriseTeam ? priseTeamEmails() : [];
    if (notifyPriseTeam && !teamEmails.length) throw new Error('The PrISE Team email address is not configured.');
    const { session, assignment, startupPeople, canSend } = await requireMentorChatPair(startupId, mentorId);
    if (!canSend) throw new Error('Program Team access is read-only.');

    const result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.mentorConversation.upsert({
        where: { startupId_mentorId: { startupId, mentorId } },
        update: { updatedAt: new Date() },
        create: { startupId, mentorId },
      });
      const chatMessage = await tx.mentorChatMessage.create({ data: { conversationId: conversation.id, authorId: session.user.id, body } });
      await tx.mentorConversationRead.upsert({
        where: { conversationId_personId: { conversationId: conversation.id, personId: session.user.id } },
        update: { lastReadAt: chatMessage.createdAt },
        create: { conversationId: conversation.id, personId: session.user.id, lastReadAt: chatMessage.createdAt },
      });
      const rows = mentorChatNotificationRows({
        messageId: chatMessage.id,
        conversationId: conversation.id,
        startupId,
        startupName: assignment.startup.name,
        mentorId,
        mentorName: assignment.person.name,
        authorId: session.user.id,
        authorName: session.user.name,
        startupRecipients: startupPeople,
      });
      const created = await Promise.all(rows.map((data) => tx.inAppNotification.create({ data, select: { id: true } })));
      await tx.activityLog.create({ data: auditData({
        actor: session.user,
        startupId,
        entityType: 'MentorChatMessage',
        entityId: chatMessage.id,
        action: 'created',
        summary: `Sent a message in the ${assignment.startup.name} mentoring conversation`,
      }) });
      let teamMessageId: string | null = null;
      if (teamEmails.length) {
        const subject = `PrISE mentoring message: ${assignment.startup.name}`;
        const textBody = `${session.user.name} sent a mentoring message regarding ${assignment.startup.name}.\n\n${body}\n\nOpen the conversation: ${process.env.APP_URL || 'http://127.0.0.1:3010'}/messages/${startupId}/${mentorId}`;
        const teamMessage = await tx.emailMessage.create({ data: {
          createdById: session.user.id,
          fromEmail: process.env.MAIL_FROM || 'PrISE 3.0 <notifications@mail.prise.bvcsrb.org>',
          replyTo: process.env.MAIL_REPLY_TO || undefined,
          toEmails: teamEmails,
          subject,
          textBody,
          htmlBody: renderOrganizationEmail(subject, textBody),
        } });
        teamMessageId = teamMessage.id;
      }
      return { notificationIds: created.map(({ id }) => id), teamMessageId };
    });

    await deliverPushForNotificationIds(result.notificationIds);
    if (result.teamMessageId && emailDeliveryConfigured()) {
      try { await sendQueuedEmailMessage(result.teamMessageId); } catch { /* Visible and retryable in the outbox. */ }
    }
    revalidatePath('/messages');
    revalidatePath(`/messages/${startupId}/${mentorId}`);
    revalidatePath('/', 'layout');
    return { status: 'success', message: 'Message sent.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'The message could not be sent.' };
  }
}

export async function markMentorConversationReadAction(startupId: string, mentorId: string) {
  const { session } = await requireMentorChatPair(startupId, mentorId);
  const conversation = await prisma.mentorConversation.findUnique({ where: { startupId_mentorId: { startupId, mentorId } }, select: { id: true } });
  if (!conversation) return;
  const readAt = new Date();
  await prisma.$transaction([
    prisma.mentorConversationRead.upsert({
      where: { conversationId_personId: { conversationId: conversation.id, personId: session.user.id } },
      update: { lastReadAt: readAt },
      create: { conversationId: conversation.id, personId: session.user.id, lastReadAt: readAt },
    }),
    prisma.inAppNotification.updateMany({
      where: { recipientId: session.user.id, relatedEntityType: 'MentorConversation', relatedEntityId: conversation.id, readAt: null },
      data: { readAt },
    }),
  ]);
  revalidatePath('/', 'layout');
}
