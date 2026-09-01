'use server';

import {
  AssignmentRole, AttendanceMode, NotificationKind, NotificationStatus, NotificationTemplateKey, Role, SessionStatus, SessionType,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { auditData } from '@/lib/audit';
import { sendQueuedNotification } from '@/lib/email';
import { enumValue, optionalDateTime, optionalText, requiredDateTime, requiredText } from '@/lib/form';
import { hasPermission, isProgramRole, requirePermission, requireSession, requireStartupAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queueTemplatedNotification } from '@/lib/notification-automation';

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

async function queueSessionAutomation(session: { id: string; title: string; startsAt: Date; meetingUrl: string | null }, startupName: string, recipients: Array<{ id: string; name: string; email: string }>, includeInvite: boolean) {
  const meetingDate = session.startsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  const meetingLink = session.meetingUrl || `${APP_URL()}/calendar`;
  await Promise.all(recipients.flatMap((recipient) => {
    const variables = { name: recipient.name, startupName, meetingTitle: session.title, meetingDate, meetingLink };
    return [
      ...(includeInvite ? [queueTemplatedNotification({ recipientId: recipient.id, recipientEmail: recipient.email, kind: NotificationKind.SESSION_INVITE, templateKey: NotificationTemplateKey.SESSION_INVITE, variables, relatedEntityType: 'Session', relatedEntityId: session.id })] : []),
      queueTemplatedNotification({ recipientId: recipient.id, recipientEmail: recipient.email, kind: NotificationKind.SESSION_REMINDER, templateKey: NotificationTemplateKey.SESSION_REMINDER, variables, relatedEntityType: 'Session', relatedEntityId: session.id, scheduledFor: new Date(session.startsAt.getTime() - 24 * 60 * 60 * 1000) }),
    ];
  }));
}

function recurrenceOccurrences(formData: FormData, startsAt: Date, endsAt: Date | null) {
  if (formData.get('recurring') !== 'on') return { groupId: null, occurrences: [{ startsAt, endsAt }] };
  const untilValue = formData.get('recurrenceUntil');
  if (typeof untilValue !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(untilValue)) throw new Error('Choose when the recurring schedule ends.');
  const until = new Date(`${untilValue}T23:59:59`);
  if (until < startsAt) throw new Error('Recurring end date must be after the first meeting.');
  const selectedDays = new Set(formData.getAll('recurrenceDay').map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6));
  if (!selectedDays.size) selectedDays.add(startsAt.getDay());
  const duration = endsAt ? endsAt.getTime() - startsAt.getTime() : null;
  const occurrences: Array<{ startsAt: Date; endsAt: Date | null }> = [];
  const cursor = new Date(startsAt);
  while (cursor <= until && occurrences.length < 90) {
    if (selectedDays.has(cursor.getDay())) occurrences.push({ startsAt: new Date(cursor), endsAt: duration === null ? null : new Date(cursor.getTime() + duration) });
    cursor.setDate(cursor.getDate() + 1);
  }
  if (!occurrences.length) throw new Error('No meetings fall within the selected recurrence range.');
  return { groupId: randomUUID(), occurrences };
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
  const recurrence = recurrenceOccurrences(formData, startsAt, endsAt);

  const created = await prisma.$transaction(async (tx) => {
    const sessions = [];
    for (const occurrence of recurrence.occurrences) sessions.push(await tx.session.create({
      data: {
        startupId,
        facilitatorId,
        title,
        description: optionalText(formData, 'description', 2500),
        type: enumValue(SessionType, formData.get('type'), 'type'),
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        participantIds: participants,
        meetingProvider: optionalText(formData, 'meetingProvider', 80),
        meetingUrl,
        recurrenceGroupId: recurrence.groupId,
      },
    }));
    await tx.activityLog.create({ data: auditData({ actor: actor.user, startupId, entityType: 'Session', entityId: sessions[0].id, action: recurrence.groupId ? 'recurring_series_created' : 'created', summary: `${startup.name}: scheduled ${title}${recurrence.groupId ? ` (${sessions.length} meetings)` : ''}` }) });
    return sessions;
  });

  const recipients = [facilitator, ...(startup.founder?.isActive ? [startup.founder] : [])];
  await Promise.all(created.map((scheduledSession, index) => queueSessionAutomation(scheduledSession, startup.name, recipients, index === 0)));
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
        insights: optionalText(formData, 'insights', 2500),
        learnings: optionalText(formData, 'learnings', 2500),
        decisions: optionalText(formData, 'decisions', 2500),
        followUpAt: optionalDateTime(formData, 'followUpAt'),
      },
    });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, startupId: existing.startupId, entityType: 'Session', entityId: sessionId, action: 'updated', summary: `${session.title}: ${status.toLowerCase()}`, meta: { from: existing.status, to: status } }) });
    return session;
  });
  await prisma.notification.updateMany({ where: { relatedEntityType: 'Session', relatedEntityId: sessionId, kind: { in: [NotificationKind.SESSION_INVITE, NotificationKind.SESSION_REMINDER] }, status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } }, data: { status: NotificationStatus.CANCELLED } });
  if (updated.startupId && updated.status === SessionStatus.SCHEDULED) {
    const [startup, recipients] = await Promise.all([
      prisma.startup.findUniqueOrThrow({ where: { id: updated.startupId }, select: { name: true } }),
      prisma.person.findMany({ where: { id: { in: updated.participantIds }, isActive: true }, select: { id: true, name: true, email: true } }),
    ]);
    const changed = existing.title !== updated.title || existing.startsAt.getTime() !== updated.startsAt.getTime() || existing.meetingUrl !== updated.meetingUrl;
    await queueSessionAutomation(updated, startup.name, recipients, changed);
  }
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
  const recurrence = recurrenceOccurrences(formData, startsAt, endsAt);
  const webinar = await prisma.$transaction(async (tx) => {
    const sessions = [];
    for (const occurrence of recurrence.occurrences) sessions.push(await tx.session.create({
      data: {
        title: requiredText(formData, 'title', 180),
        description: optionalText(formData, 'description', 2500),
        type: SessionType.WORKSHOP,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        participantIds: [],
        isCohortWide: true,
        meetingProvider: optionalText(formData, 'meetingProvider', 80),
        meetingUrl: optionalText(formData, 'meetingUrl', 1000),
        facilitatorId: optionalText(formData, 'facilitatorId', 64),
        recurrenceGroupId: recurrence.groupId,
      },
    }));
    await tx.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'Session', entityId: sessions[0].id, action: recurrence.groupId ? 'recurring_webinar_series_created' : 'webinar_created', summary: `Scheduled webinar: ${sessions[0].title}${recurrence.groupId ? ` (${sessions.length} events)` : ''}` }) });
    return sessions[0];
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
