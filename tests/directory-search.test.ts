import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesDirectoryQuery } from '../src/lib/directory-search';

test('directory search matches partial text across fields', () => {
  assert.equal(matchesDirectoryQuery('market', ['Anita', 'Growth Marketing', ['Sales', 'Branding']]), true);
});

test('directory search matches every word regardless of field', () => {
  assert.equal(matchesDirectoryQuery('program lead', ['PROGRAM_LEAD', 'PrISE team']), true);
  assert.equal(matchesDirectoryQuery('health hyderabad', ['Health', 'Visakhapatnam']), false);
});

test('empty directory search includes the record', () => {
  assert.equal(matchesDirectoryQuery('   ', ['Any mentor']), true);
});
