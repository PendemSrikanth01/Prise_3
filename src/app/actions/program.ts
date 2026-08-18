'use server';

import { ProgramActionLifecycle, ProgramActionStatus, Priority, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { enumValue, optionalDate, optionalText, requiredText } from '@/lib/form';
import { isProgramRole, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function programSession() {
  const session = await requireSession();
  if (!isProgramRole(session.user.role)) throw new Error('Only the program team can manage the action plan.');
  return session;
}

function refreshProgram() {
  revalidatePath('/');
  revalidatePath('/program');
  revalidatePath('/documents');
  revalidatePath('/insights');
}

export async function claimProgramActionAction(formData: FormData) {
  const session = await programSession();
  const id = requiredText(formData, 'actionId', 64);
  const current = await prisma.programAction.findUniqueOrThrow({ where: { id }, select: { title: true, ownerId: true } });
  if (current.ownerId && current.ownerId !== session.user.id) throw new Error('This action has already been claimed. Refresh to see the owner.');
  if (current.ownerId === session.user.id) return;
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.programAction.updateMany({ where: { id, ownerId: null }, data: { ownerId: session.user.id } });
    if (!claimed.count) throw new Error('This action was claimed by another team member.');
    await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'ProgramAction', entityId: id, action: 'claimed', summary: `${current.title}: claimed by ${session.user.name}` }) });
  });
  refreshProgram();
}

export async function updateProgramActionAction(formData: FormData) {
  const session = await programSession();
  const id = requiredText(formData, 'actionId', 64);
  const current = await prisma.programAction.findUniqueOrThrow({ where: { id } });
  const status = enumValue(ProgramActionStatus, formData.get('status'), 'status');
  const lifecycle = enumValue(ProgramActionLifecycle, formData.get('lifecycle'), 'lifecycle');
  const ownerId = optionalText(formData, 'ownerId', 64);
  if (ownerId) {
    const validOwner = await prisma.person.count({ where: { id: ownerId, isActive: true, role: { in: [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM, Role.INTERN] } } });
    if (!validOwner) throw new Error('Select an active program team member.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.programAction.update({
      where: { id },
      data: {
        status,
        lifecycle,
        priority: enumValue(Priority, formData.get('priority'), 'priority'),
        ownerId,
        dueDate: optionalDate(formData, 'dueDate'),
        notes: optionalText(formData, 'notes', 1500),
        approvedById: status === ProgramActionStatus.DONE ? session.user.id : null,
        approvedAt: status === ProgramActionStatus.DONE ? new Date() : null,
      },
    });
    await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'ProgramAction', entityId: id, action: 'updated', summary: `${current.title}: ${status.replaceAll('_', ' ').toLowerCase()}`, meta: { from: current.status, to: status, lifecycle } }) });
  });
  refreshProgram();
}

export async function addProgramSubtaskAction(formData: FormData) {
  const session = await programSession();
  const actionId = requiredText(formData, 'actionId', 64);
  const title = requiredText(formData, 'title', 180);
  const action = await prisma.programAction.findUniqueOrThrow({ where: { id: actionId }, select: { title: true, subtasks: { orderBy: { position: 'desc' }, take: 1, select: { position: true } } } });
  const created = await prisma.programActionSubtask.create({ data: { actionId, title, position: (action.subtasks[0]?.position ?? 0) + 1 } });
  await prisma.activityLog.create({ data: auditData({ actor: session.user, entityType: 'ProgramActionSubtask', entityId: created.id, action: 'created', summary: `${action.title}: added ${title}` }) });
  refreshProgram();
}

export async function updateProgramSubtaskAction(formData: FormData) {
  const session = await programSession();
  const id = requiredText(formData, 'subtaskId', 64);
  const current = await prisma.programActionSubtask.findUniqueOrThrow({ where: { id }, include: { action: { select: { title: true } } } });
  const status = enumValue(ProgramActionStatus, formData.get('status'), 'status');
  const ownerId = optionalText(formData, 'ownerId', 64);
  await prisma.$transaction(async (tx) => {
    await tx.programActionSubtask.update({ where: { id }, data: { status, ownerId, dueDate: optionalDate(formData, 'dueDate'), notes: optionalText(formData, 'notes', 1000) } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'ProgramActionSubtask', entityId: id, action: 'updated', summary: `${current.action.title} / ${current.title}: ${status.replaceAll('_', ' ').toLowerCase()}` }) });
  });
  refreshProgram();
}
