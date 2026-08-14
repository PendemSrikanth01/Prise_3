'use server';

import { DeliverableStatus, MilestoneStakeholderLane, MilestoneStakeholderState, MilestoneStatus, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { enumValue, optionalText, requiredText } from '@/lib/form';
import { hasPermission, requirePermission, requireSession, requireStartupAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { removePrivateUpload, storePrivateUpload } from '@/lib/uploads';

export type UploadState = { error?: string; success?: string } | undefined;

function refreshDocuments(startupId: string) {
  revalidatePath('/');
  revalidatePath('/documents');
  revalidatePath('/my-milestones');
  revalidatePath('/reviews');
  revalidatePath(`/startups/${startupId}`);
}

function laneForRole(role: Role) {
  if (role === Role.FOUNDER) return MilestoneStakeholderLane.STARTUP;
  if (role === Role.MENTOR) return MilestoneStakeholderLane.MENTOR;
  if (role === Role.PROGRAM_LEAD || role === Role.PROGRAM_TEAM) return MilestoneStakeholderLane.PROGRAM;
  return null;
}

export async function uploadDeliverableAction(_: UploadState, formData: FormData): Promise<UploadState> {
  let storedKey: string | null = null;
  try {
    const milestoneId = requiredText(formData, 'milestoneId', 64);
    const milestone = await prisma.milestone.findUniqueOrThrow({ where: { id: milestoneId }, select: { id: true, startupId: true, title: true } });
    const session = await requireStartupAccess(milestone.startupId, 'deliverable:upload');
    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'Choose a file to upload.' };
    const stored = await storePrivateUpload(file);
    storedKey = stored.storageKey;
    const latest = await prisma.deliverable.aggregate({ where: { milestoneId, name: file.name }, _max: { version: true } });
    const deliverable = await prisma.$transaction(async (tx) => {
      const stakeholderLane = laneForRole(session.user.role);
      const created = await tx.deliverable.create({ data: { milestoneId, uploaderId: session.user.id, name: file.name.slice(0, 240), storageKey: stored.storageKey, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, version: (latest._max.version ?? 0) + 1, status: DeliverableStatus.SUBMITTED, description: optionalText(formData, 'description', 800), submittedAt: new Date(), stakeholderLane } });
      await tx.milestone.update({ where: { id: milestoneId }, data: { status: MilestoneStatus.SUBMITTED, submittedAt: new Date() } });
      if (stakeholderLane) {
        await tx.milestoneStakeholderStatus.upsert({
          where: { milestoneId_lane: { milestoneId, lane: stakeholderLane } },
          update: { state: stakeholderLane === MilestoneStakeholderLane.STARTUP ? MilestoneStakeholderState.SUBMITTED : MilestoneStakeholderState.IN_PROGRESS, updatedById: session.user.id },
          create: { milestoneId, lane: stakeholderLane, state: stakeholderLane === MilestoneStakeholderLane.STARTUP ? MilestoneStakeholderState.SUBMITTED : MilestoneStakeholderState.IN_PROGRESS, updatedById: session.user.id },
        });
      }
      await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: milestone.startupId, entityType: 'Deliverable', entityId: created.id, action: 'uploaded', summary: `${milestone.title}: uploaded ${file.name}` }) });
      return created;
    });
    refreshDocuments(milestone.startupId);
    return { success: `${deliverable.name} was submitted for review.` };
  } catch (error) {
    if (storedKey) await removePrivateUpload(storedKey);
    return { error: error instanceof Error ? error.message : 'Upload failed.' };
  }
}

export async function reviewDeliverableAction(formData: FormData) {
  const session = await requirePermission('deliverable:review');
  const deliverableId = requiredText(formData, 'deliverableId', 64);
  const deliverable = await prisma.deliverable.findUniqueOrThrow({ where: { id: deliverableId }, include: { milestone: { select: { startupId: true, title: true } } } });
  await requireStartupAccess(deliverable.milestone.startupId, 'deliverable:review');
  const status = enumValue(DeliverableStatus, formData.get('status'), 'status');
  if (status !== DeliverableStatus.APPROVED && status !== DeliverableStatus.NEEDS_REVISION && status !== DeliverableStatus.ARCHIVED) throw new Error('Select a valid review decision.');
  await prisma.$transaction(async (tx) => {
    await tx.deliverable.update({ where: { id: deliverableId }, data: { status, reviewerId: session.user.id, feedback: optionalText(formData, 'feedback', 1500), reviewedAt: new Date() } });
    const lane = laneForRole(session.user.role);
    if (lane && lane !== MilestoneStakeholderLane.STARTUP && status !== DeliverableStatus.ARCHIVED) {
      await tx.milestoneStakeholderStatus.upsert({
        where: { milestoneId_lane: { milestoneId: deliverable.milestoneId, lane } },
        update: { state: status === DeliverableStatus.APPROVED ? MilestoneStakeholderState.APPROVED : MilestoneStakeholderState.NEEDS_REVISION, note: optionalText(formData, 'feedback', 1500), updatedById: session.user.id },
        create: { milestoneId: deliverable.milestoneId, lane, state: status === DeliverableStatus.APPROVED ? MilestoneStakeholderState.APPROVED : MilestoneStakeholderState.NEEDS_REVISION, note: optionalText(formData, 'feedback', 1500), updatedById: session.user.id },
      });
      const statuses = await tx.milestoneStakeholderStatus.findMany({ where: { milestoneId: deliverable.milestoneId }, select: { lane: true, state: true } });
      const programApproved = statuses.some((item) => item.lane === MilestoneStakeholderLane.PROGRAM && item.state === MilestoneStakeholderState.APPROVED);
      const needsRevision = statuses.some((item) => item.state === MilestoneStakeholderState.NEEDS_REVISION);
      await tx.milestone.update({ where: { id: deliverable.milestoneId }, data: { status: programApproved ? MilestoneStatus.APPROVED : needsRevision ? MilestoneStatus.NEEDS_REVISION : MilestoneStatus.SUBMITTED, reviewerId: session.user.id, approvedAt: programApproved ? new Date() : null } });
    }
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: deliverable.milestone.startupId, entityType: 'Deliverable', entityId: deliverableId, action: 'reviewed', summary: `${deliverable.milestone.title}: document marked ${status.replaceAll('_', ' ').toLowerCase()}` }) });
  });
  refreshDocuments(deliverable.milestone.startupId);
}

export async function archiveDeliverableAction(formData: FormData) {
  const deliverableId = requiredText(formData, 'deliverableId', 64);
  const deliverable = await prisma.deliverable.findUniqueOrThrow({ where: { id: deliverableId }, include: { milestone: { select: { startupId: true } } } });
  const session = await requireSession();
  await requireStartupAccess(deliverable.milestone.startupId);
  const mayArchive = hasPermission(session.user.role, 'deliverable:review') || (session.user.id === deliverable.uploaderId && deliverable.status !== DeliverableStatus.APPROVED);
  if (!mayArchive) throw new Error('Approved evidence cannot be removed by the startup.');
  await prisma.$transaction(async (tx) => {
    await tx.deliverable.update({ where: { id: deliverableId }, data: { status: DeliverableStatus.ARCHIVED } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: deliverable.milestone.startupId, entityType: 'Deliverable', entityId: deliverableId, action: 'archived', summary: `Archived document: ${deliverable.name}` }) });
  });
  refreshDocuments(deliverable.milestone.startupId);
}
