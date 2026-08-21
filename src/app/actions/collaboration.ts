'use server';

import { Role, SupportAudience } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { canAccessSupportThread } from '@/lib/collaboration-policy';
import { enumValue, requiredText } from '@/lib/form';
import { isProgramRole, requireSession, requireStartupAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function refreshThread(startupId: string) {
  revalidatePath('/work');
  revalidatePath('/support');
  revalidatePath(`/startups/${startupId}`);
}

export async function addTaskCommentAction(formData: FormData) {
  const taskId = requiredText(formData, 'taskId', 64);
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, select: { id: true, startupId: true, title: true } });
  if (!task.startupId) throw new Error('Task discussions require a startup-linked task.');
  const session = await requireStartupAccess(task.startupId, 'task:manage');
  const body = requiredText(formData, 'body', 3000);
  await prisma.$transaction(async (tx) => {
    const comment = await tx.taskComment.create({ data: { taskId, startupId: task.startupId!, authorId: session.user.id, body } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: task.startupId, entityType: 'TaskComment', entityId: comment.id, action: 'created', summary: `Commented on task: ${task.title}` }) });
  });
  refreshThread(task.startupId);
}

async function supportAccess(requestId: string) {
  const session = await requireSession();
  const request = await prisma.supportRequest.findUniqueOrThrow({
    where: { id: requestId },
    select: {
      id: true,
      startupId: true,
      requestedById: true,
      title: true,
      audience: true,
      participants: { where: { personId: session.user.id }, select: { id: true } },
      startup: {
        select: {
          memberships: { where: { personId: session.user.id, isActive: true }, select: { id: true } },
          assignments: { where: { personId: session.user.id }, select: { id: true } },
        },
      },
    },
  });
  await requireStartupAccess(request.startupId);
  const allowed = canAccessSupportThread({
    role: session.user.role,
    audience: request.audience,
    isRequester: request.requestedById === session.user.id,
    isExplicitParticipant: request.participants.length > 0,
    isStartupMember: request.startup.memberships.length > 0 || session.user.founderOfStartupId === request.startupId,
    isStartupAssignee: request.startup.assignments.length > 0,
  });
  if (!allowed) throw new Error('This support conversation is private.');
  return { session, request };
}

export async function addSupportMessageAction(formData: FormData) {
  const requestId = requiredText(formData, 'requestId', 64);
  const { session, request } = await supportAccess(requestId);
  const body = requiredText(formData, 'body', 3000);
  await prisma.$transaction(async (tx) => {
    const message = await tx.supportMessage.create({ data: { supportRequestId: requestId, startupId: request.startupId, authorId: session.user.id, body } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: request.startupId, entityType: 'SupportMessage', entityId: message.id, action: 'created', summary: `Replied to support request: ${request.title}` }) });
  });
  refreshThread(request.startupId);
}

export async function updateSupportAudienceAction(formData: FormData) {
  const requestId = requiredText(formData, 'requestId', 64);
  const { session, request } = await supportAccess(requestId);
  if (!isProgramRole(session.user.role) && request.requestedById !== session.user.id) throw new Error('Only the requester or program team can change conversation access.');
  const audience = enumValue(SupportAudience, formData.get('audience'), 'audience');
  const requestedIds = [...new Set(formData.getAll('participantId').filter((value): value is string => typeof value === 'string'))];
  const eligible = requestedIds.length ? await prisma.person.findMany({
    where: {
      id: { in: requestedIds },
      isActive: true,
      OR: [
        { role: { in: [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM] } },
        { founderOfStartupId: request.startupId },
        { startupMemberships: { some: { startupId: request.startupId, isActive: true } } },
        { assignments: { some: { startupId: request.startupId } } },
      ],
    },
    select: { id: true },
  }) : [];
  if (eligible.length !== requestedIds.length) throw new Error('One or more selected people do not belong to this startup workspace.');
  const participantIds = new Set(eligible.map((person) => person.id));
  if (request.requestedById) participantIds.add(request.requestedById);
  if (audience === SupportAudience.SELECTED_PEOPLE && participantIds.size < 2) throw new Error('Select at least one other participant.');
  await prisma.$transaction(async (tx) => {
    await tx.supportRequest.update({ where: { id: requestId }, data: { audience } });
    await tx.supportParticipant.deleteMany({ where: { supportRequestId: requestId } });
    if (participantIds.size) await tx.supportParticipant.createMany({ data: [...participantIds].map((personId) => ({ supportRequestId: requestId, personId })) });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: request.startupId, entityType: 'SupportRequest', entityId: requestId, action: 'audience_updated', summary: `${request.title}: conversation access changed to ${audience.replaceAll('_', ' ').toLowerCase()}` }) });
  });
  refreshThread(request.startupId);
}
