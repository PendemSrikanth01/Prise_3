import assert from 'node:assert/strict';
import test from 'node:test';
import { Role } from '@prisma/client';
import { canEditMentorProfile, minuteToTime, parseCapacity, parseTagList, timeToMinute } from '../src/lib/mentor-profile';

test('mentor profile editing is limited to program roles and the mentor themself', () => {
  assert.equal(canEditMentorProfile({ id: 'lead', role: Role.PROGRAM_LEAD }, 'mentor-1'), true);
  assert.equal(canEditMentorProfile({ id: 'team', role: Role.PROGRAM_TEAM }, 'mentor-1'), true);
  assert.equal(canEditMentorProfile({ id: 'mentor-1', role: Role.MENTOR }, 'mentor-1'), true);
  assert.equal(canEditMentorProfile({ id: 'mentor-2', role: Role.MENTOR }, 'mentor-1'), false);
  assert.equal(canEditMentorProfile({ id: 'founder', role: Role.FOUNDER }, 'mentor-1'), false);
});

test('mentor matching tags are trimmed, deduplicated and bounded', () => {
  assert.deepEqual(parseTagList('Impact, Finance, Impact,  Marketing '), ['Impact', 'Finance', 'Marketing']);
});

test('capacity and weekly time helpers reject invalid values', () => {
  assert.equal(parseCapacity('6'), 6);
  assert.throws(() => parseCapacity('0'));
  assert.equal(timeToMinute('10:30'), 630);
  assert.equal(minuteToTime(630), '10:30');
  assert.throws(() => timeToMinute('25:00'));
});
