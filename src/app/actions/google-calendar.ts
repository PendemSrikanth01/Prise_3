'use server';

import { CalendarSyncStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { hasPermission, requireSession } from '@/lib/auth';
import { revokeGoogleCalendarConnection } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

export async function disconnectGoogleCalendarAction() {
  const session = await requireSession();
  if (!hasPermission(session.user.role, 'session:manage') && !hasPermission(session.user.role, 'webinar:manage')) throw new Error('Forbidden');
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { personId: session.user.id } });
  if (!connection) return;
  await revokeGoogleCalendarConnection(connection);
  await prisma.$transaction([
    prisma.activityLog.create({ data: { actorId: session.user.id, actorRole: session.user.role, entityType: 'GoogleCalendarConnection', entityId: connection.id, action: 'disconnected', summary: `${session.user.name}: disconnected Google Calendar` } }),
    prisma.session.updateMany({
      where: { calendarConnectionId: connection.id },
      data: { calendarConnectionId: null, externalEventId: null, calendarSyncStatus: CalendarSyncStatus.NOT_CONNECTED, calendarSyncError: null },
    }),
    prisma.googleCalendarConnection.delete({ where: { id: connection.id } }),
  ]);
  revalidatePath('/calendar');
}
