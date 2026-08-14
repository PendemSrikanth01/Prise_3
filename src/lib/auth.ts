import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'prise_session';
const SESSION_HOURS = 12;

export type Permission =
  | 'startup:update'
  | 'onboarding:review'
  | 'milestone:assign'
  | 'task:manage'
  | 'milestone:review'
  | 'deliverable:upload'
  | 'deliverable:review'
  | 'payment:manage'
  | 'support:create'
  | 'support:manage'
  | 'session:manage'
  | 'webinar:manage'
  | 'notification:manage'
  | 'people:manage'
  | 'audit:view';

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  PROGRAM_LEAD: new Set([
    'startup:update', 'onboarding:review', 'milestone:assign', 'task:manage',
    'milestone:review', 'deliverable:upload', 'deliverable:review', 'payment:manage', 'support:create', 'support:manage',
    'session:manage', 'webinar:manage', 'notification:manage', 'people:manage', 'audit:view',
  ]),
  PROGRAM_TEAM: new Set([
    'startup:update', 'onboarding:review', 'milestone:assign', 'task:manage',
    'milestone:review', 'deliverable:upload', 'deliverable:review', 'payment:manage', 'support:create', 'support:manage',
    'session:manage', 'webinar:manage', 'notification:manage', 'audit:view',
  ]),
  INTERN: new Set(['task:manage', 'support:create', 'support:manage']),
  MENTOR: new Set(['task:manage', 'milestone:review', 'deliverable:upload', 'deliverable:review', 'support:create', 'support:manage', 'session:manage']),
  EXPERT: new Set(['support:create', 'support:manage']),
  INVESTOR: new Set(),
  FOUNDER: new Set(['task:manage', 'deliverable:upload', 'support:create']),
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  founderOfStartupId: string | null;
  mustChangePassword: boolean;
};

export type VerifiedSession = {
  sessionId: string;
  expiresAt: Date;
  user: AuthUser;
};

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  return value;
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function privacyHash(value: string) {
  return createHmac('sha256', sessionSecret()).update(value.trim().toLowerCase()).digest('hex');
}

function cookieIsSecure() {
  const appUrl = process.env.APP_URL;
  return appUrl ? appUrl.startsWith('https://') : process.env.NODE_ENV === 'production';
}

export async function createAuthSession(personId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await prisma.authSession.create({
    data: {
      personId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      userAgent: userAgent?.slice(0, 500) || null,
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieIsSecure(),
    path: '/',
    expires: expiresAt,
    priority: 'high',
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.authSession.updateMany({
      where: { tokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export const getSession = cache(async (): Promise<VerifiedSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      person: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          founderOfStartupId: true,
          mustChangePassword: true,
        },
      },
    },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.person.isActive) return null;
  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    user: {
      id: session.person.id,
      name: session.person.name,
      email: session.person.email,
      role: session.person.role,
      founderOfStartupId: session.person.founderOfStartupId,
      mustChangePassword: session.person.mustChangePassword,
    },
  };
});

export async function requireSession(options?: { allowPasswordChange?: boolean }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.user.mustChangePassword && !options?.allowPasswordChange) redirect('/account/password');
  return session;
}

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].has(permission);
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, permission)) throw new Error('Forbidden');
  return session;
}

export function accessibleStartupWhere(user: AuthUser): Prisma.StartupWhereInput {
  const globalViewRoles = new Set<Role>([Role.PROGRAM_LEAD, Role.PROGRAM_TEAM, Role.INVESTOR]);
  if (globalViewRoles.has(user.role)) return {};
  if (user.role === Role.FOUNDER) return { id: user.founderOfStartupId ?? '__none__' };
  return { assignments: { some: { personId: user.id } } };
}

export async function requireStartupAccess(startupId: string, permission?: Permission) {
  const session = await requireSession();
  if (permission && !hasPermission(session.user.role, permission)) throw new Error('Forbidden');
  const startup = await prisma.startup.findFirst({
    where: { id: startupId, ...accessibleStartupWhere(session.user) },
    select: { id: true },
  });
  if (!startup) throw new Error('Forbidden');
  return session;
}
