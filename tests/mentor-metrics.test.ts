import assert from 'node:assert/strict';
import test from 'node:test';
import { mentorAttention, mentorAttentionReason } from '../src/lib/mentor-metrics';

const healthy = {
  isActive: true,
  assignedStartupCount: 2,
  pendingReviewCount: 0,
  openSupportCount: 0,
  hasUpcomingSession: true,
};

test('mentor attention prioritises support before reviews and scheduling', () => {
  const input = { ...healthy, openSupportCount: 1, pendingReviewCount: 3, hasUpcomingSession: false };
  assert.equal(mentorAttention(input), 'NEEDS_SUPPORT');
  assert.equal(mentorAttentionReason(input, 'NEEDS_SUPPORT'), '1 open support request need a response.');
});

test('mentor without assignments is clearly available for matching', () => {
  assert.equal(mentorAttention({ ...healthy, assignedStartupCount: 0 }), 'UNASSIGNED');
});

test('mentor is on track only when assignment, reviews and session are covered', () => {
  assert.equal(mentorAttention(healthy), 'ON_TRACK');
});
