import 'server-only';

import { Prisma, Role, SupportAudience } from '@prisma/client';
import { accessibleStartupWhere, type AuthUser } from '@/lib/auth';

export function accessibleSupportWhere(user: AuthUser): Prisma.SupportRequestWhereInput {
  const startup = accessibleStartupWhere(user);
  if (user.role === Role.PROGRAM_LEAD || user.role === Role.PROGRAM_TEAM) return { startup };
  const sharedAudience = user.role === Role.FOUNDER
    ? [SupportAudience.STARTUP_TEAM, SupportAudience.STARTUP_AND_MENTORS]
    : [SupportAudience.STARTUP_AND_MENTORS];
  return {
    startup,
    OR: [
      { requestedById: user.id },
      { participants: { some: { personId: user.id } } },
      { audience: { in: sharedAudience } },
    ],
  };
}
