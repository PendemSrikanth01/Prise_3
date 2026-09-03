import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRecipients } from '../src/lib/email-addresses';

test('email recipients are normalized, deduplicated and kept in field priority', () => {
  assert.deepEqual(normalizeRecipients({
    to: [' Lead@Example.com, mentor@example.com '],
    cc: ['lead@example.com', 'team@example.com'],
    bcc: ['TEAM@example.com', 'private@example.com'],
  }), {
    to: ['lead@example.com', 'mentor@example.com'],
    cc: ['team@example.com'],
    bcc: ['private@example.com'],
  });
});

test('email recipients require a valid primary recipient and enforce the cap', () => {
  assert.throws(() => normalizeRecipients({ to: ['bad'], cc: [], bcc: [] }), /Invalid email/);
  assert.throws(() => normalizeRecipients({ to: [], cc: ['team@example.com'], bcc: [] }), /at least one/);
  assert.throws(() => normalizeRecipients({ to: ['one@example.com', 'two@example.com'], cc: [], bcc: [] }, 1), /no more than 1/);
});
