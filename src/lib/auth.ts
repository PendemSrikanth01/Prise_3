import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { Prisma, Role, StartupMemberRole, StartupStatus } from '@prisma/client';
import { hasPermission, hasStartupPermission, type Permission } from '@/lib/access-policy';
import { prisma } from '@/lib/prisma';

export { canDeleteTaskRecord, canEditTaskRecord, canManageStartupMembers, hasPermission, hasStartupPermission, isProgramRole } from '@/lib/access-policy';
export type { Permission } from '@/lib/access-policy';

export const SESSION_COOKIE = 'prise_session';
const SESSION_HOURS = 12;

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

export async function requireSession(options?: { allowPasswordChange?: boolean; allowPendingApplication?: boolean }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.user.mustChangePassword && !options?.allowPasswordChange) redirect('/account/password');
  if (session.user.role === Role.FOUNDER && !options?.allowPendingApplication) {
    const startup = await prisma.startup.findFirst({
      where: {
        OR: [
          { id: session.user.founderOfStartupId ?? '__none__' },
          { memberships: { some: { personId: session.user.id, isActive: true } } },
        ],
      },
      select: { status: true },
    });
    if (startup?.status === StartupStatus.APPLICATION_PENDING || startup?.status === StartupStatus.REJECTED) redirect('/application');
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, permission)) throw new Error('Forbidden');
  return session;
}

export function accessibleStartupWhere(user: AuthUser): Prisma.StartupWhereInput {
  const globalViewRoles = new Set<Role>([Role.PROGRAM_LEAD, Role.PROGRAM_TEAM]);
  if (globalViewRoles.has(user.role)) return {};
  if (user.role === Role.INVESTOR) return { investorShares: { some: { investorId: user.id } } };
  if (user.role === Role.FOUNDER) return {
    OR: [
      { id: user.founderOfStartupId ?? '__none__' },
      { memberships: { some: { personId: user.id, isActive: true } } },
    ],
  };
  return { assignments: { some: { personId: user.id } } };
}

export async function startupMemberRole(startupId: string, personId: string) {
  const membership = await prisma.startupMembership.findUnique({
    where: { startupId_personId: { startupId, personId } },
    select: { role: true, isActive: true },
  });
  return membership?.isActive ? membership.role : null;
}

export async function resolveFounderStartupId(user: Pick<AuthUser, 'id' | 'founderOfStartupId'>) {
  if (user.founderOfStartupId) return user.founderOfStartupId;
  const membership = await prisma.startupMembership.findFirst({
    where: { personId: user.id, isActive: true },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: { startupId: true },
  });
  return membership?.startupId ?? null;
}

export async function requireStartupAccess(startupId: string, permission?: Permission) {
  const session = await requireSession();
  const startup = await prisma.startup.findFirst({
    where: { id: startupId, ...accessibleStartupWhere(session.user) },
    select: { id: true, memberships: { where: { personId: session.user.id, isActive: true }, select: { role: true }, take: 1 } },
  });
  if (!startup) throw new Error('Forbidden');
  if (permission) {
    const memberRole = session.user.role === Role.FOUNDER
      ? startup.memberships[0]?.role ?? (session.user.founderOfStartupId === startupId ? StartupMemberRole.OWNER : null)
      : null;
    if (!hasStartupPermission(session.user.role, permission, memberRole)) throw new Error('Forbidden');
  }
  return session;
}
