'use server';

import {
  AssignmentRole, AttendanceMode, NotificationKind, NotificationStatus, Role, SessionStatus, SessionType,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { sendQueuedNotification } from '@/lib/email';
import { enumValue, optionalDateTime, optionalText, requiredDateTime, requiredText } from '@/lib/form';
import { hasPermission, isProgramRole, requirePermission, requireSession, requireStartupAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sessionInviteTemplate } from '@/lib/notification-templates';

const APP_URL = () => process.env.APP_URL || 'http://127.0.0.1:3010';

function refreshMentorWorkspace(startupId?: string | null) {
  revalidatePath('/');
  revalidatePath('/calendar');
  revalidatePath('/notifications');
  if (startupId) revalidatePath(`/startups/${startupId}`);
}

function validateTimes(startsAt: Date, endsAt: Date | null) {
  if (endsAt && endsAt <= startsAt) throw new Error('End time must be after start time.');
}

export async function createSessionAction(formData: FormData) {
  const startupId = requiredText(formData, 'startupId', 64);
  const actor = await requireStartupAccess(startupId, 'session:manage');
  const startsAt = requiredDateTime(formData, 'startsAt');
  const endsAt = optionalDateTime(formData, 'endsAt');
  validateTimes(startsAt, endsAt);

  const startup = await prisma.startup.findUniqueOrThrow({
    where: { id: startupId },
    select: { name: true, founder: { select: { id: true, name: true, email: true, isActive: true } } },
  });
  const requestedFacilitatorId = optionalText(formData, 'facilitatorId', 64);
  const facilitatorId = actor.user.role === Role.MENTOR ? actor.user.id : requestedFacilitatorId ?? actor.user.id;
  const facilitator = await prisma.person.findFirstOrThrow({
    where: { id: facilitatorId, isActive: true },
    select: { id: true, name: true, email: true },
  });
  const participants = [...new Set([facilitator.id, startup.founder?.isActive ? startup.founder.id : null].filter((id): id is string => Boolean(id)))];
  const title = requiredText(formData, 'title', 180);
  const meetingUrl = optionalText(formData, 'meetingUrl', 1000);

  const created = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        startupId,
        facilitatorId,
        title,
        description: optionalText(formData, 'description', 2500),
        type: enumValue(SessionType, formData.get('type'), 'type'),
        startsAt,
        endsAt,
        participantIds: participants,
        meetingProvider: optionalText(formData, 'meetingProvider', 80),
        meetingUrl,
      },
    });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, startupId, entityType: 'Session', entityId: session.id, action: 'created', summary: `${startup.name}: scheduled ${title}` }) });
    return session;
  });

  const recipients = [facilitator, ...(startup.founder?.isActive ? [startup.founder] : [])];
  await prisma.notification.createMany({
    data: recipients.map((recipient) => {
      const template = sessionInviteTemplate({ name: recipient.name, startupName: startup.name, title, startsAt, meetingUrl, url: `${APP_URL()}/calendar` });
      return { recipientId: recipient.id, recipientEmail: recipient.email, kind: NotificationKind.SESSION_INVITE, subject: template.subject, htmlBody: template.html, textBody: template.text, relatedEntityType: 'Session', relatedEntityId: created.id };
    }),
  });
  refreshMentorWorkspace(startupId);
}

export async function updateSessionAction(formData: FormData) {
  const sessionId = requiredText(formData, 'sessionId', 64);
  const existing = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
  const actor = existing.startupId
    ? await requireStartupAccess(existing.startupId, 'session:manage')
    : await requirePermission('webinar:manage');
  const startsAt = requiredDateTime(formData, 'startsAt');
  const endsAt = optionalDateTime(formData, 'endsAt');
  validateTimes(startsAt, endsAt);
  const status = enumValue(SessionStatus, formData.get('status'), 'status');
  const updated = await prisma.$transaction(async (tx) => {
    const session = await tx.session.update({
      where: { id: sessionId },
      data: {
        title: requiredText(formData, 'title', 180),
        description: optionalText(formData, 'description', 2500),
        status,
        startsAt,
        endsAt,
        meetingUrl: optionalText(formData, 'meetingUrl', 1000),
        outcome: optionalText(formData, 'outcome', 2500),
        nextActions: optionalText(formData, 'nextActions', 2500),
      },
    });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, startupId: existing.startupId, entityType: 'Session', entityId: sessionId, action: 'updated', summary: `${session.title}: ${status.toLowerCase()}`, meta: { from: existing.status, to: status } }) });
    return session;
  });
  refreshMentorWorkspace(updated.startupId);
}

export async function deleteSessionAction(formData: FormData) {
  const sessionId = requiredText(formData, 'sessionId', 64);
  const existing = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
  const actor = existing.startupId
    ? await requireStartupAccess(existing.startupId, 'session:manage')
    : await requirePermission('webinar:manage');
  if (existing.status === SessionStatus.COMPLETED) throw new Error('Completed sessions are retained as program evidence.');
  await prisma.$transaction(async (tx) => {
    await tx.notification.updateMany({ where: { relatedEntityType: 'Session', relatedEntityId: sessionId, status: { not: NotificationStatus.SENT } }, data: { status: NotificationStatus.CANCELLED } });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, startupId: existing.startupId, entityType: 'Session', entityId: sessionId, action: 'deleted', summary: `Deleted session: ${existing.title}` }) });
    await tx.session.delete({ where: { id: sessionId } });
  });
  refreshMentorWorkspace(existing.startupId);
}

export async function recordAttendanceAction(formData: FormData) {
  const actor = await requireSession();
  if (!isProgramRole(actor.user.role)) throw new Error('Only the program team can record cohort attendance.');
  const sessionId = requiredText(formData, 'sessionId', 64);
  const startupId = requiredText(formData, 'startupId', 64);
  const mode = enumValue(AttendanceMode, formData.get('mode'), 'mode');
  const [event, startup] = await Promise.all([
    prisma.session.findUniqueOrThrow({ where: { id: sessionId }, select: { title: true } }),
    prisma.startup.findUniqueOrThrow({ where: { id: startupId }, select: { name: true } }),
  ]);
  await prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.upsert({
      where: { sessionId_startupId: { sessionId, startupId } },
      update: { mode, note: optionalText(formData, 'note', 500), recordedById: actor.user.id },
      create: { sessionId, startupId, mode, note: optionalText(formData, 'note', 500), recordedById: actor.user.id },
    });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, startupId, entityType: 'AttendanceRecord', entityId: record.id, action: 'recorded', summary: `${event.title}: ${startup.name} marked ${mode.toLowerCase()}` }) });
  });
  revalidatePath('/calendar');
  revalidatePath('/insights');
}

export async function clearAttendanceAction(formData: FormData) {
  const actor = await requireSession();
  if (!isProgramRole(actor.user.role)) throw new Error('Only the program team can correct cohort attendance.');
  const attendanceId = requiredText(formData, 'attendanceId', 64);
  const record = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: attendanceId }, include: { session: { select: { title: true } }, startup: { select: { name: true } } } });
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({ data: auditData({ actor: actor.user, startupId: record.startupId, entityType: 'AttendanceRecord', entityId: attendanceId, action: 'cleared', summary: `${record.session.title}: cleared attendance for ${record.startup.name}` }) });
    await tx.attendanceRecord.delete({ where: { id: attendanceId } });
  });
  revalidatePath('/calendar');
  revalidatePath('/insights');
}

export async function createWebinarAction(formData: FormData) {
  const actor = await requirePermission('webinar:manage');
  const startsAt = requiredDateTime(formData, 'startsAt');
  const endsAt = optionalDateTime(formData, 'endsAt');
  validateTimes(startsAt, endsAt);
  const webinar = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        title: requiredText(formData, 'title', 180),
        description: optionalText(formData, 'description', 2500),
        type: SessionType.WORKSHOP,
        startsAt,
        endsAt,
        participantIds: [],
        isCohortWide: true,
        meetingProvider: optionalText(formData, 'meetingProvider', 80),
        meetingUrl: optionalText(formData, 'meetingUrl', 1000),
        facilitatorId: optionalText(formData, 'facilitatorId', 64),
      },
    });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'Session', entityId: session.id, action: 'webinar_created', summary: `Scheduled webinar: ${session.title}` }) });
    return session;
  });
  refreshMentorWorkspace(webinar.startupId);
}

export async function createCalendarEventAction(formData: FormData) {
  const type = enumValue(SessionType, formData.get('type'), 'type');
  if (type === SessionType.WORKSHOP) return createWebinarAction(formData);
  return createSessionAction(formData);
}

export async function sendNotificationAction(formData: FormData) {
  await requirePermission('notification:manage');
  await sendQueuedNotification(requiredText(formData, 'notificationId', 64));
  revalidatePath('/notifications');
}

export async function cancelNotificationAction(formData: FormData) {
  await requirePermission('notification:manage');
  const notificationId = requiredText(formData, 'notificationId', 64);
  await prisma.notification.updateMany({ where: { id: notificationId, status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } }, data: { status: NotificationStatus.CANCELLED } });
  revalidatePath('/notifications');
}

export async function assignStartupPersonAction(formData: FormData) {
  const startupId = requiredText(formData, 'startupId', 64);
  const actor = await requireStartupAccess(startupId, 'startup:update');
  if (!hasPermission(actor.user.role, 'people:manage') && actor.user.role !== Role.PROGRAM_TEAM) throw new Error('Forbidden');
  const personId = requiredText(formData, 'personId', 64);
  const role = enumValue(AssignmentRole, formData.get('assignmentRole'), 'assignmentRole');
  const person = await prisma.person.findFirstOrThrow({ where: { id: personId, isActive: true }, select: { name: true } });
  await prisma.$transaction(async (tx) => {
    const assignment = await tx.startupAssignment.upsert({ where: { startupId_personId_role: { startupId, personId, role } }, update: {}, create: { startupId, personId, role } });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, startupId, entityType: 'StartupAssignment', entityId: assignment.id, action: 'created', summary: `Assigned ${person.name} as ${role.toLowerCase()}` }) });
  });
  revalidatePath('/settings');
  refreshMentorWorkspace(startupId);
}

export async function removeStartupPersonAction(formData: FormData) {
  const assignmentId = requiredText(formData, 'assignmentId', 64);
  const assignment = await prisma.startupAssignment.findUniqueOrThrow({ where: { id: assignmentId }, include: { person: { select: { name: true } } } });
  const actor = await requireStartupAccess(assignment.startupId, 'startup:update');
  if (!hasPermission(actor.user.role, 'people:manage') && actor.user.role !== Role.PROGRAM_TEAM) throw new Error('Forbidden');
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({ data: auditData({ actor: actor.user, startupId: assignment.startupId, entityType: 'StartupAssignment', entityId: assignmentId, action: 'deleted', summary: `Removed ${assignment.person.name} from the startup team` }) });
    await tx.startupAssignment.delete({ where: { id: assignmentId } });
  });
  revalidatePath('/settings');
  refreshMentorWorkspace(assignment.startupId);
}
