import assert from 'node:assert/strict';
import test from 'node:test';
import { Role } from '@prisma/client';
import { assertAllocationCandidates, canSelectCoreMentor, MAX_MATCHING_PREFERENCES, normalizeAllocationIds, normalizeMatchingPreferenceIds } from '../src/lib/matching';

test('allocations normalize IDs and allow clearing assignments', () => {
  assert.deepEqual(normalizeAllocationIds([' a ', 'a', '', 'b']), ['a', 'b']);
  assert.deepEqual(normalizeAllocationIds([]), []);
  assert.doesNotThrow(() => assertAllocationCandidates([], []));
});

test('unavailable candidates reject the entire allocation request', () => {
  assert.throws(() => assertAllocationCandidates(['a', 'inactive'], [{ id: 'a' }]), /No assignments were changed/);
  assert.doesNotThrow(() => assertAllocationCandidates(['a'], [{ id: 'a' }]));
});

test('matching preferences remove blanks and duplicates while preserving rank order', () => {
  assert.deepEqual(normalizeMatchingPreferenceIds(['a', 'b', 'a', '']), ['a', 'b']);
});

test('matching preferences require one and allow at most three', () => {
  assert.equal(MAX_MATCHING_PREFERENCES, 3);
  assert.throws(() => normalizeMatchingPreferenceIds([]), /at least one/i);
  assert.throws(() => normalizeMatchingPreferenceIds(['a', 'b', 'c', 'd']), /up to 3/i);
});

test('only the incubatee connected to the startup can select its Core Mentor', () => {
  assert.equal(canSelectCoreMentor(Role.FOUNDER, 'startup-a', 'startup-a'), true);
  assert.equal(canSelectCoreMentor(Role.FOUNDER, 'startup-b', 'startup-a'), false);
  assert.equal(canSelectCoreMentor(Role.PROGRAM_LEAD, 'startup-a', 'startup-a'), false);
  assert.equal(canSelectCoreMentor(Role.PROGRAM_TEAM, 'startup-a', 'startup-a'), false);
  assert.equal(canSelectCoreMentor(Role.MENTOR, 'startup-a', 'startup-a'), false);
});
