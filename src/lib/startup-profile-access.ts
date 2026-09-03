import { Role, StartupStatus } from '@prisma/client';
import type { AuthUser } from '@/lib/auth';
import { isProgramRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function canAccessStartupProfile(user: AuthUser, startupId: string) {
  if (isProgramRole(user.role)) return true;
  if (user.role === Role.MENTOR) {
    return Boolean(await prisma.startup.findFirst({
      where: { id: startupId, status: { in: [StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION] } },
      select: { id: true }
    }));
  }
  if (user.role === Role.FOUNDER) {
    if (user.founderOfStartupId === startupId) return true;
    return Boolean(await prisma.startupMembership.findFirst({ where: { startupId, personId: user.id, isActive: true }, select: { id: true } }));
  }
  return false;
}

export async function accessibleStartupProfileIds(user: AuthUser, startupIds: string[]) {
  if (isProgramRole(user.role)) return new Set(startupIds);
  if (user.role === Role.MENTOR) {
    const rows = await prisma.startup.findMany({
      where: { id: { in: startupIds }, status: { in: [StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION] } },
      select: { id: true }
    });
    return new Set(rows.map(({ id }) => id));
  }
  if (user.role === Role.FOUNDER) {
    const rows = await prisma.startup.findMany({ where: { id: { in: startupIds }, OR: [{ id: user.founderOfStartupId || '__none__' }, { memberships: { some: { personId: user.id, isActive: true } } }] }, select: { id: true } });
    return new Set(rows.map(({ id }) => id));
  }
  return new Set<string>();
}
