import assert from 'node:assert/strict';
import test from 'node:test';
import { AttendanceMode, StartupStatus } from '@prisma/client';
import { attendanceSummary, groupValues, startupStatusLabel } from '../src/lib/dashboard-metrics';

test('group values produces deterministic counts', () => {
  assert.deepEqual(groupValues(['Telangana', 'Karnataka', 'Telangana']), [
    { name: 'Telangana', value: 2 },
    { name: 'Karnataka', value: 1 },
  ]);
});

test('attendance summary separates offline, online and absent records', () => {
  const summary = attendanceSummary({
    title: 'PrISE 3.0 Workshop 2',
    startsAt: new Date('2026-08-14T09:00:00.000Z'),
    attendance: [
      { mode: AttendanceMode.OFFLINE }, { mode: AttendanceMode.OFFLINE },
      { mode: AttendanceMode.ONLINE }, { mode: AttendanceMode.ABSENT },
    ],
  });
  assert.equal(summary.name, 'Workshop 2');
  assert.deepEqual({ offline: summary.offline, online: summary.online, absent: summary.absent }, { offline: 2, online: 1, absent: 1 });
});

test('startup status labels stay human readable', () => {
  assert.equal(startupStatusLabel(StartupStatus.NEEDS_ATTENTION), 'Needs attention');
  assert.equal(startupStatusLabel(StartupStatus.APPLICATION_PENDING), 'Application pending');
});
