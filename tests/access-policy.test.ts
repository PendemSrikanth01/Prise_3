import assert from 'node:assert/strict';
import test from 'node:test';
import { Role, StartupMemberRole } from '@prisma/client';
import { canDeleteTaskRecord, canEditTaskRecord, canManageStartupMembers, hasPermission, hasStartupPermission } from '../src/lib/access-policy';

test('program roles have broad workflow access without giving Program Team account administration', () => {
  assert.equal(hasPermission(Role.PROGRAM_LEAD, 'people:manage'), true);
  assert.equal(hasPermission(Role.PROGRAM_TEAM, 'milestone:review'), true);
  assert.equal(hasPermission(Role.PROGRAM_TEAM, 'people:manage'), false);
  assert.equal(hasPermission(Role.INVESTOR, 'deliverable:upload'), false);
});

test('startup membership roles follow least privilege', () => {
  assert.equal(hasStartupPermission(Role.FOUNDER, 'startup:update', StartupMemberRole.OWNER), true);
  assert.equal(hasStartupPermission(Role.FOUNDER, 'payment:manage', StartupMemberRole.FINANCE), true);
  assert.equal(hasStartupPermission(Role.FOUNDER, 'startup:update', StartupMemberRole.MEMBER), false);
  assert.equal(hasStartupPermission(Role.FOUNDER, 'task:manage', StartupMemberRole.VIEWER), false);
  assert.equal(canManageStartupMembers(Role.FOUNDER, StartupMemberRole.ADMIN), true);
  assert.equal(canManageStartupMembers(Role.FOUNDER, StartupMemberRole.MEMBER), false);
});

test('task updates and deletes respect ownership and assignment', () => {
  const founder = { id: 'founder-1', role: Role.FOUNDER };
  const mentor = { id: 'mentor-1', role: Role.MENTOR };
  assert.equal(canEditTaskRecord(founder, { createdById: 'other', assigneeId: 'founder-1' }), true);
  assert.equal(canDeleteTaskRecord(founder, { createdById: 'other' }), false);
  assert.equal(canEditTaskRecord(mentor, { createdById: 'other', assigneeId: 'other' }), false);
  assert.equal(canDeleteTaskRecord({ id: 'lead', role: Role.PROGRAM_LEAD }, { createdById: 'other' }), true);
});
