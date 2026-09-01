import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_MATCHING_PREFERENCES, normalizeMatchingPreferenceIds } from '../src/lib/matching';

test('matching preferences remove blanks and duplicates while preserving rank order', () => {
  assert.deepEqual(normalizeMatchingPreferenceIds(['a', 'b', 'a', '']), ['a', 'b']);
});

test('matching preferences require one and allow at most three', () => {
  assert.equal(MAX_MATCHING_PREFERENCES, 3);
  assert.throws(() => normalizeMatchingPreferenceIds([]), /at least one/i);
  assert.throws(() => normalizeMatchingPreferenceIds(['a', 'b', 'c', 'd']), /up to 3/i);
});
