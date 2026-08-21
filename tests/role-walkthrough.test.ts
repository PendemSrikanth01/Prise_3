import assert from 'node:assert/strict';
import test from 'node:test';
import { Role, StartupMemberRole } from '@prisma/client';
import { hasPermission, hasStartupPermission } from '../src/lib/access-policy';

test('Program walkthrough: operational changes, approvals, corrections and audit are permitted', () => {
  for (const role of [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM]) {
    assert.equal(hasPermission(role, 'startup:update'), true);
    assert.equal(hasPermission(role, 'milestone:review'), true);
    assert.equal(hasPermission(role, 'support:manage'), true);
    assert.equal(hasPermission(role, 'session:manage'), true);
    assert.equal(hasPermission(role, 'audit:view'), true);
  }
  assert.equal(hasPermission(Role.PROGRAM_LEAD, 'people:manage'), true);
  assert.equal(hasPermission(Role.PROGRAM_TEAM, 'people:manage'), false);
});

test('Mentor walkthrough: assigned startup delivery tools are available but administration stays private', () => {
  assert.equal(hasPermission(Role.MENTOR, 'milestone:review'), true);
  assert.equal(hasPermission(Role.MENTOR, 'deliverable:review'), true);
  assert.equal(hasPermission(Role.MENTOR, 'session:manage'), true);
  assert.equal(hasPermission(Role.MENTOR, 'support:manage'), true);
  assert.equal(hasPermission(Role.MENTOR, 'payment:manage'), false);
  assert.equal(hasPermission(Role.MENTOR, 'people:manage'), false);
  assert.equal(hasPermission(Role.MENTOR, 'audit:view'), false);
});

test('Founder walkthrough: startup owners execute their pipeline without reviewer or admin access', () => {
  assert.equal(hasStartupPermission(Role.FOUNDER, 'startup:update', StartupMemberRole.OWNER), true);
  assert.equal(hasStartupPermission(Role.FOUNDER, 'task:manage', StartupMemberRole.OWNER), true);
  assert.equal(hasStartupPermission(Role.FOUNDER, 'deliverable:upload', StartupMemberRole.OWNER), true);
  assert.equal(hasStartupPermission(Role.FOUNDER, 'payment:manage', StartupMemberRole.OWNER), true);
  assert.equal(hasStartupPermission(Role.FOUNDER, 'milestone:review', StartupMemberRole.OWNER), false);
  assert.equal(hasStartupPermission(Role.FOUNDER, 'people:manage', StartupMemberRole.OWNER), false);
  assert.equal(hasStartupPermission(Role.FOUNDER, 'audit:view', StartupMemberRole.OWNER), false);
});
