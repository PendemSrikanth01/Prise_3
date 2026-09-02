import 'server-only';

import { CalendarSyncStatus, SessionStatus } from '@prisma/client';
import { createGoogleMeetEvent, deleteGoogleMeetEvent, updateGoogleMeetEvent } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

type Connection = { id: string; refreshTokenEncrypted: string; googleAccountEmail: string };

async function attendeeEmails(participantIds: string[], organizerEmail: string) {
  const people = await prisma.person.findMany({ where: { id: { in: participantIds }, isActive: true }, select: { email: true } });
  return people.map(({ email }) => email).filter((email) => email.toLowerCase() !== organizerEmail.toLowerCase());
}

async function syncError(sessionId: string, connectionId: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Google Calendar synchronization failed.';
  await prisma.session.update({ where: { id: sessionId }, data: { calendarConnectionId: connectionId, calendarSyncStatus: CalendarSyncStatus.ERROR, calendarSyncError: message.slice(0, 500) } });
  return message;
}

export async function googleConnectionForPerson(personId: string) {
  return prisma.googleCalendarConnection.findUnique({ where: { personId }, select: { id: true, refreshTokenEncrypted: true, googleAccountEmail: true } });
}

export async function syncNewSessionsToGoogle(sessionIds: string[], connection: Connection) {
  for (const sessionId of sessionIds) {
    const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    try {
      const result = await createGoogleMeetEvent(connection, { title: session.title, description: session.description, startsAt: session.startsAt, endsAt: session.endsAt, attendeeEmails: await attendeeEmails(session.participantIds, connection.googleAccountEmail) });
      await prisma.session.update({ where: { id: session.id }, data: { calendarConnectionId: connection.id, externalEventId: result.externalEventId, meetingProvider: 'Google Meet', meetingUrl: result.meetingUrl, calendarSyncStatus: CalendarSyncStatus.SYNCED, calendarSyncError: null, calendarSyncedAt: new Date() } });
    } catch (error) {
      await syncError(session.id, connection.id, error);
    }
  }
}

export async function syncUpdatedSessionToGoogle(sessionId: string) {
  const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId }, include: { calendarConnection: true } });
  const connection = session.calendarConnection;
  if (!connection) return;
  try {
    if (session.status === SessionStatus.CANCELLED) {
      if (session.externalEventId) await deleteGoogleMeetEvent(connection, session.externalEventId);
      await prisma.session.update({ where: { id: session.id }, data: { externalEventId: null, meetingUrl: null, calendarSyncStatus: CalendarSyncStatus.SYNCED, calendarSyncError: null, calendarSyncedAt: new Date() } });
      return;
    }
    const input = { title: session.title, description: session.description, startsAt: session.startsAt, endsAt: session.endsAt, attendeeEmails: await attendeeEmails(session.participantIds, connection.googleAccountEmail) };
    if (session.externalEventId) {
      const result = await updateGoogleMeetEvent(connection, session.externalEventId, input);
      await prisma.session.update({ where: { id: session.id }, data: { ...(result.meetingUrl ? { meetingUrl: result.meetingUrl } : {}), calendarSyncStatus: CalendarSyncStatus.SYNCED, calendarSyncError: null, calendarSyncedAt: new Date() } });
    } else {
      const result = await createGoogleMeetEvent(connection, input);
      await prisma.session.update({ where: { id: session.id }, data: { externalEventId: result.externalEventId, meetingProvider: 'Google Meet', meetingUrl: result.meetingUrl, calendarSyncStatus: CalendarSyncStatus.SYNCED, calendarSyncError: null, calendarSyncedAt: new Date() } });
    }
  } catch (error) {
    await syncError(session.id, connection.id, error);
  }
}

export async function removeGoogleEventBeforeSessionDelete(sessionId: string) {
  const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId }, include: { calendarConnection: true } });
  if (!session.externalEventId || !session.calendarConnection) return;
  await deleteGoogleMeetEvent(session.calendarConnection, session.externalEventId);
}
