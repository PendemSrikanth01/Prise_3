import assert from 'node:assert/strict';
import test from 'node:test';
import { Role, SessionStatus } from '@prisma/client';
import { sessionNotificationPlan, sessionRescheduleFeedback, sessionScheduleChanged, validateSessionCompletion, validateSessionEditor, validateSessionReschedule } from '../src/lib/session-lifecycle';

test('scheduled meetings can be moved earlier or later', () => {
  assert.doesNotThrow(() => validateSessionReschedule({
    currentStatus: SessionStatus.SCHEDULED,
    actorRole: Role.MENTOR,
    confirmedCompletedCorrection: false,
  }));

  const current = {
    title: 'Finance review',
    description: 'Quarterly review',
    startsAt: new Date('2026-10-06T15:00:00.000Z'),
    endsAt: new Date('2026-10-06T16:00:00.000Z'),
    meetingUrl: 'https://meet.google.com/example',
    status: SessionStatus.SCHEDULED,
  };
  assert.equal(sessionScheduleChanged(current, { ...current, startsAt: new Date('2026-10-06T14:00:00.000Z') }), true);
  assert.equal(sessionScheduleChanged(current, { ...current, startsAt: new Date('2026-10-06T16:00:00.000Z') }), true);
  assert.equal(sessionScheduleChanged(current, { ...current }), false);
});

test('completed schedule correction requires Program Lead confirmation', () => {
  assert.throws(
    () => validateSessionReschedule({ currentStatus: SessionStatus.COMPLETED, actorRole: Role.MENTOR, confirmedCompletedCorrection: true }),
    /Program Lead/,
  );
  assert.throws(
    () => validateSessionReschedule({ currentStatus: SessionStatus.COMPLETED, actorRole: Role.PROGRAM_LEAD, confirmedCompletedCorrection: false }),
    /Confirm/,
  );
  assert.doesNotThrow(() => validateSessionReschedule({
    currentStatus: SessionStatus.COMPLETED,
    actorRole: Role.PROGRAM_LEAD,
    confirmedCompletedCorrection: true,
  }));
});

test('a mentor cannot update another facilitators meeting', () => {
  assert.throws(
    () => validateSessionEditor({ actorRole: Role.MENTOR, actorId: 'mentor-1', facilitatorId: 'mentor-2' }),
    /only update sessions they facilitate/,
  );
  assert.doesNotThrow(() => validateSessionEditor({ actorRole: Role.MENTOR, actorId: 'mentor-1', facilitatorId: 'mentor-1' }));
  assert.doesNotThrow(() => validateSessionEditor({ actorRole: Role.PROGRAM_TEAM, actorId: 'team-1', facilitatorId: 'mentor-2' }));
});

test('a meeting can be completed only after it starts and while not cancelled', () => {
  const now = new Date('2026-10-06T12:00:00.000Z');
  assert.doesNotThrow(() => validateSessionCompletion({ currentStatus: SessionStatus.SCHEDULED, startsAt: new Date('2026-10-06T11:00:00.000Z'), now }));
  assert.throws(
    () => validateSessionCompletion({ currentStatus: SessionStatus.SCHEDULED, startsAt: new Date('2026-10-06T13:00:00.000Z'), now }),
    /not started/,
  );
  assert.throws(
    () => validateSessionCompletion({ currentStatus: SessionStatus.CANCELLED, startsAt: new Date('2026-10-06T11:00:00.000Z'), now }),
    /cancelled/,
  );
});

test('rescheduling replaces pending invitations and reminders', () => {
  assert.deepEqual(sessionNotificationPlan(SessionStatus.SCHEDULED, true), {
    cancelPending: true,
    queueInvite: true,
    queueReminder: true,
  });
  assert.deepEqual(sessionNotificationPlan(SessionStatus.CANCELLED, true), {
    cancelPending: true,
    queueInvite: false,
    queueReminder: false,
  });
  assert.deepEqual(sessionNotificationPlan(SessionStatus.SCHEDULED, false), {
    cancelPending: false,
    queueInvite: false,
    queueReminder: false,
  });
});

test('Google sync failure reports that the PrISE save succeeded', () => {
  assert.deepEqual(sessionRescheduleFeedback({ googleSyncFailed: true, status: SessionStatus.SCHEDULED, completedCorrection: false }), {
    status: 'warning',
    message: 'Saved in PrISE, but Google Calendar sync failed. Reconnect Google Calendar and try the schedule again.',
  });
});
