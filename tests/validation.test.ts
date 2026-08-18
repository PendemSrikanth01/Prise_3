import assert from 'node:assert/strict';
import test from 'node:test';
import { optionalDate, positiveMoney, requiredText } from '../src/lib/form';
import { validPassword } from '../src/lib/password';

test('password policy accepts 6+ characters and rejects shorter values', () => {
  assert.equal(validPassword('prise1'), true);
  assert.equal(validPassword('12345'), false);
});

test('form validation trims text and rejects invalid money', () => {
  const valid = new FormData();
  valid.set('title', '  Clear outcome  ');
  valid.set('amount', '1500');
  valid.set('dueDate', '2026-08-31');
  assert.equal(requiredText(valid, 'title'), 'Clear outcome');
  assert.equal(positiveMoney(valid, 'amount'), 1500);
  assert.equal(optionalDate(valid, 'dueDate')?.toISOString(), '2026-08-31T00:00:00.000Z');
  const invalid = new FormData();
  invalid.set('amount', '-1');
  assert.throws(() => positiveMoney(invalid, 'amount'));
});
