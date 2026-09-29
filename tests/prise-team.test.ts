import assert from 'node:assert/strict';
import test from 'node:test';
import { priseTeamEmails } from '../src/lib/prise-team';

test('PrISE Team CC defaults to the confirmed coordination team', () => {
  const original = process.env.PRISE_TEAM_CC;
  delete process.env.PRISE_TEAM_CC;
  const recipients = priseTeamEmails();
  assert.equal(recipients.length, 3);
  assert.ok(recipients.every((email) => email.endsWith('@balavikasa.org')));
  if (original === undefined) delete process.env.PRISE_TEAM_CC;
  else process.env.PRISE_TEAM_CC = original;
});

test('PrISE Team CC remains configurable and removes duplicates', () => {
  const original = process.env.PRISE_TEAM_CC;
  process.env.PRISE_TEAM_CC = 'Team@Example.org, team@example.org, second@example.org';
  assert.deepEqual(priseTeamEmails(), ['team@example.org', 'second@example.org']);
  if (original === undefined) delete process.env.PRISE_TEAM_CC;
  else process.env.PRISE_TEAM_CC = original;
});
