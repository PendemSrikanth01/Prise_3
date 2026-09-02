import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPasswordResetToken, passwordResetExpiry, validPasswordResetToken } from '../src/lib/password-reset';

test('password reset tokens are hashed deterministically', () => {
  assert.equal(hashPasswordResetToken('example'), hashPasswordResetToken('example'));
  assert.notEqual(hashPasswordResetToken('example'), 'example');
});

test('password reset links expire after 30 minutes', () => {
  assert.equal(passwordResetExpiry(new Date('2026-09-02T10:00:00.000Z')).toISOString(), '2026-09-02T10:30:00.000Z');
});

test('only 32-byte base64url reset tokens are accepted', () => {
  assert.equal(validPasswordResetToken('a'.repeat(43)), true);
  assert.equal(validPasswordResetToken('short-token'), false);
  assert.equal(validPasswordResetToken(`${'a'.repeat(42)}+`), false);
});
