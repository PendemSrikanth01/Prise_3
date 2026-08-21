import assert from 'node:assert/strict';
import test from 'node:test';
import { Role, SupportAudience } from '@prisma/client';
import { canAccessSupportThread, canDeleteSupportRequest } from '../src/lib/collaboration-policy';

const base = {
  role: Role.MENTOR,
  audience: SupportAudience.STARTUP_AND_MENTORS,
  isRequester: false,
  isExplicitParticipant: false,
  isStartupMember: false,
  isStartupAssignee: false,
};

test('program roles can access every support audience', () => {
  for (const role of [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM]) {
    for (const audience of Object.values(SupportAudience)) {
      assert.equal(canAccessSupportThread({ ...base, role, audience }), true);
    }
  }
});

test('startup team and mentor audiences stay scoped to the intended people', () => {
  assert.equal(canAccessSupportThread({ ...base, role: Role.FOUNDER, audience: SupportAudience.STARTUP_TEAM, isStartupMember: true }), true);
  assert.equal(canAccessSupportThread({ ...base, isStartupAssignee: true }), true);
  assert.equal(canAccessSupportThread({ ...base, audience: SupportAudience.STARTUP_TEAM, isStartupAssignee: true }), false);
  assert.equal(canAccessSupportThread({ ...base, role: Role.FOUNDER, audience: SupportAudience.PROGRAM_PRIVATE, isStartupMember: true }), false);
});

test('requesters and selected participants retain access while deletion stays program-only', () => {
  assert.equal(canAccessSupportThread({ ...base, audience: SupportAudience.SELECTED_PEOPLE, isExplicitParticipant: true }), true);
  assert.equal(canAccessSupportThread({ ...base, audience: SupportAudience.PROGRAM_PRIVATE, isRequester: true }), true);
  assert.equal(canDeleteSupportRequest(Role.PROGRAM_LEAD), true);
  assert.equal(canDeleteSupportRequest(Role.PROGRAM_TEAM), true);
  assert.equal(canDeleteSupportRequest(Role.MENTOR), false);
  assert.equal(canDeleteSupportRequest(Role.FOUNDER), false);
});
