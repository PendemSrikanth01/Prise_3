import { Role, StartupMemberRole } from '@prisma/client';

export type Permission =
  | 'startup:update' | 'onboarding:review' | 'milestone:assign' | 'task:manage'
  | 'milestone:review' | 'deliverable:upload' | 'deliverable:review' | 'payment:manage'
  | 'support:create' | 'support:manage' | 'session:manage' | 'webinar:manage'
  | 'notification:manage' | 'people:manage' | 'audit:view';

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  PROGRAM_LEAD: new Set(['startup:update', 'onboarding:review', 'milestone:assign', 'task:manage', 'milestone:review', 'deliverable:upload', 'deliverable:review', 'payment:manage', 'support:create', 'support:manage', 'session:manage', 'webinar:manage', 'notification:manage', 'people:manage', 'audit:view']),
  PROGRAM_TEAM: new Set(['startup:update', 'onboarding:review', 'milestone:assign', 'task:manage', 'milestone:review', 'deliverable:upload', 'deliverable:review', 'payment:manage', 'support:create', 'support:manage', 'session:manage', 'webinar:manage', 'notification:manage', 'audit:view']),
  INTERN: new Set(['task:manage', 'support:create', 'support:manage']),
  MENTOR: new Set(['task:manage', 'milestone:review', 'deliverable:upload', 'deliverable:review', 'support:create', 'support:manage', 'session:manage']),
  EXPERT: new Set(['support:create', 'support:manage']),
  INVESTOR: new Set(),
  FOUNDER: new Set(['task:manage', 'deliverable:upload', 'support:create']),
};

const STARTUP_MEMBER_PERMISSIONS: Record<StartupMemberRole, ReadonlySet<Permission>> = {
  OWNER: new Set(['startup:update', 'task:manage', 'deliverable:upload', 'payment:manage', 'support:create']),
  ADMIN: new Set(['startup:update', 'task:manage', 'deliverable:upload', 'payment:manage', 'support:create']),
  MEMBER: new Set(['task:manage', 'deliverable:upload', 'support:create']),
  FINANCE: new Set(['payment:manage', 'support:create']),
  VIEWER: new Set(),
};

type AccessUser = { id: string; role: Role };

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function isProgramRole(role: Role) {
  return role === Role.PROGRAM_LEAD || role === Role.PROGRAM_TEAM;
}

export function canEditTaskRecord(user: AccessUser, task: { createdById: string | null; assigneeId: string | null }) {
  if (isProgramRole(user.role)) return true;
  if (!hasPermission(user.role, 'task:manage')) return false;
  return task.createdById === user.id || task.assigneeId === user.id;
}

export function canDeleteTaskRecord(user: AccessUser, task: { createdById: string | null }) {
  if (isProgramRole(user.role)) return true;
  return hasPermission(user.role, 'task:manage') && task.createdById === user.id;
}

export function canManageStartupMembers(role: Role, membershipRole: StartupMemberRole | null) {
  return isProgramRole(role) || (role === Role.FOUNDER && (membershipRole === StartupMemberRole.OWNER || membershipRole === StartupMemberRole.ADMIN));
}

export function hasStartupPermission(role: Role, permission: Permission, membershipRole: StartupMemberRole | null) {
  if (role !== Role.FOUNDER) return hasPermission(role, permission);
  return membershipRole ? STARTUP_MEMBER_PERMISSIONS[membershipRole].has(permission) : false;
}
