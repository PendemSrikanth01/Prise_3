import 'server-only';

import { Prisma, Role } from '@prisma/client';

type AuditActor = { id: string; role: Role };

export function auditData(input: {
  actor: AuditActor;
  entityType: string;
  entityId: string;
  startupId?: string | null;
  action: string;
  summary: string;
  meta?: Prisma.InputJsonValue;
}): Prisma.ActivityLogCreateInput {
  return {
    actor: { connect: { id: input.actor.id } },
    actorRole: input.actor.role,
    startup: input.startupId ? { connect: { id: input.startupId } } : undefined,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    summary: input.summary,
    meta: input.meta,
  };
}

