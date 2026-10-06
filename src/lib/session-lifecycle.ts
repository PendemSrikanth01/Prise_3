import { Role, SessionStatus } from '@prisma/client';

export function validateSessionEditor(params: { actorRole: Role; actorId: string; facilitatorId: string | null }) {
  if (params.actorRole === Role.MENTOR && params.facilitatorId !== params.actorId) {
    throw new Error('Mentors can only update sessions they facilitate.');
  }
}

export function validateSessionReschedule(params: {
  currentStatus: SessionStatus;
  actorRole: Role;
  confirmedCompletedCorrection: boolean;
}) {
  if (params.currentStatus !== SessionStatus.COMPLETED) return;
  if (params.actorRole !== Role.PROGRAM_LEAD) {
    throw new Error('Completed meeting schedules are locked. Ask the Program Lead to correct the record.');
  }
  if (!params.confirmedCompletedCorrection) {
    throw new Error('Confirm that you want to correct this completed meeting record.');
  }
}

export function validateSessionCompletion(params: {
  currentStatus: SessionStatus;
  startsAt: Date;
  now?: Date;
}) {
  if (params.currentStatus === SessionStatus.CANCELLED) {
    throw new Error('A cancelled meeting cannot be completed. Reschedule it first.');
  }
  if (params.currentStatus === SessionStatus.COMPLETED) return;
  if (params.startsAt > (params.now ?? new Date())) {
    throw new Error('This meeting has not started yet. Reschedule it or complete it after the start time.');
  }
}

export function sessionScheduleChanged(
  current: { title: string; description: string | null; startsAt: Date; endsAt: Date | null; meetingUrl: string | null; status: SessionStatus },
  next: { title: string; description: string | null; startsAt: Date; endsAt: Date | null; meetingUrl: string | null; status: SessionStatus },
) {
  return current.title !== next.title
    || current.description !== next.description
    || current.startsAt.getTime() !== next.startsAt.getTime()
    || current.endsAt?.getTime() !== next.endsAt?.getTime()
    || current.meetingUrl !== next.meetingUrl
    || current.status !== next.status;
}

export function sessionNotificationPlan(status: SessionStatus, scheduleChanged: boolean) {
  return {
    cancelPending: scheduleChanged,
    queueInvite: scheduleChanged && status === SessionStatus.SCHEDULED,
    queueReminder: scheduleChanged && status === SessionStatus.SCHEDULED,
  };
}

export function sessionRescheduleFeedback(params: { googleSyncFailed: boolean; status: SessionStatus; completedCorrection: boolean }) {
  if (params.googleSyncFailed) {
    return { status: 'warning' as const, message: 'Saved in PrISE, but Google Calendar sync failed. Reconnect Google Calendar and try the schedule again.' };
  }
  if (params.status === SessionStatus.CANCELLED) return { status: 'success' as const, message: 'Meeting cancelled successfully.' };
  if (params.completedCorrection) return { status: 'success' as const, message: 'Completed meeting record corrected and audited.' };
  return { status: 'success' as const, message: 'Meeting schedule updated. Invitations and reminders were refreshed.' };
}
