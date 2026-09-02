import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSessionTimes } from '../src/lib/calendar-time';

test('calendar accepts 15-minute meeting intervals', () => {
  assert.doesNotThrow(() => validateSessionTimes(new Date('2026-09-03T04:30:00.000Z'), new Date('2026-09-03T05:15:00.000Z')));
});

test('calendar rejects invalid minutes and end-before-start', () => {
  assert.throws(() => validateSessionTimes(new Date('2026-09-03T04:37:00.000Z'), null), /15-minute/);
  assert.throws(() => validateSessionTimes(new Date('2026-09-03T05:30:00.000Z'), new Date('2026-09-03T05:15:00.000Z')), /after start/);
});
