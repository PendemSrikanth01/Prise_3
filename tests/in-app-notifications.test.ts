import assert from 'node:assert/strict';
import test from 'node:test';
import { InAppNotificationKind } from '@prisma/client';
import { mentorMappingNotificationRows } from '../src/lib/in-app-notifications';

test('mapping additions notify the mentor and each unique startup owner', () => {
  const rows = mentorMappingNotificationRows({
    changeId: 'change-1',
    startup: { id: 'startup-1', name: 'Mangapeta FPCL' },
    startupRecipients: [{ id: 'founder-1', name: 'Founder' }, { id: 'founder-1', name: 'Founder' }],
    addedMentors: [{ id: 'mentor-1', name: 'Ravi Kumar' }],
    removedMentors: [],
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(({ recipientId }) => recipientId).sort(), ['founder-1', 'mentor-1']);
  assert.ok(rows.every(({ kind }) => kind === InAppNotificationKind.MENTOR_MAPPING_ADDED));
  assert.match(rows.find(({ recipientId }) => recipientId === 'founder-1')?.message ?? '', /Ravi Kumar/);
});

test('mapping removals use distinct event keys and do not create rows for unchanged mappings', () => {
  const unchanged = mentorMappingNotificationRows({ changeId: 'change-2', startup: { id: 'startup-1', name: 'Startup' }, startupRecipients: [], addedMentors: [], removedMentors: [] });
  assert.deepEqual(unchanged, []);

  const rows = mentorMappingNotificationRows({
    changeId: 'change-3',
    startup: { id: 'startup-1', name: 'Startup' },
    startupRecipients: [{ id: 'founder-1', name: 'Founder' }],
    addedMentors: [],
    removedMentors: [{ id: 'mentor-1', name: 'Mentor' }],
  });
  assert.equal(new Set(rows.map(({ eventKey }) => eventKey)).size, rows.length);
  assert.ok(rows.every(({ kind }) => kind === InAppNotificationKind.MENTOR_MAPPING_REMOVED));
});
