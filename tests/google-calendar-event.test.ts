import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGoogleCalendarEvent } from '../src/lib/google-calendar-event';

test('builds a one-hour Google Calendar event when no end is supplied', () => {
  const startsAt = new Date('2026-09-03T04:30:00.000Z');
  const event = buildGoogleCalendarEvent({ title: 'Mentor review', startsAt, attendeeEmails: [] });
  assert.equal(event.start.dateTime, '2026-09-03T04:30:00.000Z');
  assert.equal(event.end.dateTime, '2026-09-03T05:30:00.000Z');
  assert.equal(event.start.timeZone, 'Asia/Kolkata');
});

test('normalizes and deduplicates attendee emails', () => {
  const event = buildGoogleCalendarEvent({
    title: 'Program meeting',
    startsAt: new Date('2026-09-03T04:30:00.000Z'),
    attendeeEmails: [' Mentor@Example.org ', 'mentor@example.org', '', 'founder@example.org'],
  });
  assert.deepEqual(event.attendees, [{ email: 'mentor@example.org' }, { email: 'founder@example.org' }]);
});

test('requests a Google Meet conference when a request id is supplied', () => {
  const event = buildGoogleCalendarEvent({ title: 'Review', startsAt: new Date('2026-09-03T04:30:00.000Z'), attendeeEmails: [] }, 'request-123');
  assert.deepEqual(event.conferenceData, { createRequest: { requestId: 'request-123', conferenceSolutionKey: { type: 'hangoutsMeet' } } });
});
