'use server';

import { DeliverableStatus, MilestoneStakeholderLane, MilestoneStakeholderState, OnboardingStatus, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { enumValue, optionalText, requiredText } from '@/lib/form';
import { accessibleStartupWhere, hasPermission, hasStartupPermission, isProgramRole, requirePermission, requireSession, requireStartupAccess, startupMemberRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { removePrivateUpload, storePrivateUpload } from '@/lib/uploads';
import { setMilestoneLaneState } from '@/lib/milestone-state';

export type UploadState = { error?: string; success?: string } | undefined;

export async function uploadOnboardingDocumentAction(_: UploadState, formData: FormData): Promise<UploadState> {
  let storedKey: string | null = null;
  try {
    const session = await requireSession({ allowPendingApplication: true });
    if (session.user.role !== Role.FOUNDER) return { error: 'Only startup members can upload onboarding files.' };
    const onboardingItemId = requiredText(formData, 'onboardingItemId', 64);
    const item = await prisma.onboardingItem.findFirst({
      where: { id: onboardingItemId, startup: accessibleStartupWhere(session.user) },
      select: { id: true, type: true, startupId: true },
    });
    if (!item) return { error: 'Onboarding item not found.' };
    const memberRole = await startupMemberRole(item.startupId, session.user.id);
    if (!hasStartupPermission(session.user.role, 'deliverable:upload', memberRole)) return { error: 'Your startup role cannot upload onboarding files.' };
    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'Choose a file to upload.' };
    const stored = await storePrivateUpload(file);
    storedKey = stored.storageKey;
    const latest = await prisma.onboardingDocument.aggregate({ where: { onboardingItemId, name: file.name }, _max: { version: true } });
    await prisma.$transaction(async (tx) => {
      const document = await tx.onboardingDocument.create({ data: { onboardingItemId, uploaderId: session.user.id, name: file.name.slice(0, 240), storageKey: stored.storageKey, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, version: (latest._max.version ?? 0) + 1, description: optionalText(formData, 'description', 800) } });
      await tx.onboardingItem.update({ where: { id: onboardingItemId }, data: { status: OnboardingStatus.SUBMITTED, submittedAt: new Date(), approvedAt: null } });
      await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: item.startupId, entityType: 'OnboardingDocument', entityId: document.id, action: 'uploaded', summary: `${item.type.replaceAll('_', ' ')}: uploaded ${file.name}` }) });
    });
    revalidatePath('/application');
    refreshDocuments(item.startupId);
    return { success: `${file.name} was submitted for review.` };
  } catch (error) {
    if (storedKey) await removePrivateUpload(storedKey);
    return { error: error instanceof Error ? error.message : 'Upload failed.' };
  }
}

export async function archiveOnboardingDocumentAction(formData: FormData) {
  const session = await requireSession({ allowPendingApplication: true });
  const documentId = requiredText(formData, 'onboardingDocumentId', 64);
  const document = await prisma.onboardingDocument.findFirstOrThrow({
    where: { id: documentId, archivedAt: null },
    include: { onboardingItem: { include: { startup: { select: { id: true, name: true } } } } },
  });
  await requireStartupAccess(document.onboardingItem.startupId);
  const programReviewer = hasPermission(session.user.role, 'onboarding:review');
  const uploaderMayArchive = session.user.id === document.uploaderId && document.onboardingItem.status !== OnboardingStatus.APPROVED;
  if (!programReviewer && !uploaderMayArchive) throw new Error('Only the uploader or program team can archive this file version.');
  await prisma.$transaction(async (tx) => {
    await tx.onboardingDocument.update({ where: { id: documentId }, data: { archivedAt: new Date() } });
    const remaining = await tx.onboardingDocument.count({ where: { onboardingItemId: document.onboardingItemId, archivedAt: null } });
    if (!remaining && document.onboardingItem.status !== OnboardingStatus.APPROVED && document.onboardingItem.status !== OnboardingStatus.NA) {
      await tx.onboardingItem.update({ where: { id: document.onboardingItemId }, data: { status: OnboardingStatus.PENDING, submittedAt: null } });
    }
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: document.onboardingItem.startupId, entityType: 'OnboardingDocument', entityId: documentId, action: 'archived', summary: `${document.onboardingItem.startup.name}: archived ${document.name}` }) });
  });
  revalidatePath('/application');
  refreshDocuments(document.onboardingItem.startupId);
}

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
    if (session.user.role !== Role.FOUNDER && session.user.role !== Role.PROGRAM_LEAD) return { error: 'Only the incubatee or Program Lead can add milestone evidence.' };
    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'Choose a file to upload.' };
    const stored = await storePrivateUpload(file);
    storedKey = stored.storageKey;
    const latest = await prisma.deliverable.aggregate({ where: { milestoneId, name: file.name }, _max: { version: true } });
    const deliverable = await prisma.$transaction(async (tx) => {
      const stakeholderLane = laneForRole(session.user.role);
      const created = await tx.deliverable.create({ data: { milestoneId, uploaderId: session.user.id, name: file.name.slice(0, 240), storageKey: stored.storageKey, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, version: (latest._max.version ?? 0) + 1, status: DeliverableStatus.SUBMITTED, description: optionalText(formData, 'description', 800), submittedAt: new Date(), stakeholderLane } });
      if (stakeholderLane) {
        await setMilestoneLaneState(tx, { milestoneId, lane: stakeholderLane, state: stakeholderLane === MilestoneStakeholderLane.STARTUP ? MilestoneStakeholderState.SUBMITTED : MilestoneStakeholderState.IN_PROGRESS, updatedById: session.user.id });
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
      await setMilestoneLaneState(tx, { milestoneId: deliverable.milestoneId, lane, state: status === DeliverableStatus.APPROVED ? MilestoneStakeholderState.APPROVED : MilestoneStakeholderState.NEEDS_REVISION, note: optionalText(formData, 'feedback', 1500), updatedById: session.user.id });
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
  const incubateeOwnsFile = session.user.role === Role.FOUNDER && session.user.id === deliverable.uploaderId && deliverable.status !== DeliverableStatus.APPROVED;
  const mayArchive = session.user.role === Role.PROGRAM_LEAD || incubateeOwnsFile;
  if (!mayArchive) throw new Error('Only the incubatee who uploaded this evidence or the Program Lead can remove it.');
  await prisma.$transaction(async (tx) => {
    await tx.deliverable.update({ where: { id: deliverableId }, data: { status: DeliverableStatus.ARCHIVED } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: deliverable.milestone.startupId, entityType: 'Deliverable', entityId: deliverableId, action: 'archived', summary: `Archived document: ${deliverable.name}` }) });
  });
  refreshDocuments(deliverable.milestone.startupId);
}

export async function uploadProgramEvidenceAction(_: UploadState, formData: FormData): Promise<UploadState> {
  let storedKey: string | null = null;
  try {
    const session = await requireSession();
    if (!isProgramRole(session.user.role)) return { error: 'Only the program team can upload program evidence.' };
    const actionId = requiredText(formData, 'programActionId', 64);
    const subtaskId = optionalText(formData, 'subtaskId', 64);
    const action = await prisma.programAction.findUniqueOrThrow({ where: { id: actionId }, select: { id: true, title: true, subtasks: { where: subtaskId ? { id: subtaskId } : { id: '__none__' }, select: { id: true } } } });
    if (subtaskId && action.subtasks.length === 0) return { error: 'That checklist item does not belong to the selected action.' };
    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'Choose a file to upload.' };
    const stored = await storePrivateUpload(file);
    storedKey = stored.storageKey;
    const latest = await prisma.programActionEvidence.aggregate({ where: { actionId, name: file.name }, _max: { version: true } });
    const evidence = await prisma.$transaction(async (tx) => {
      const created = await tx.programActionEvidence.create({ data: { actionId, subtaskId, uploaderId: session.user.id, name: file.name.slice(0, 240), storageKey: stored.storageKey, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, version: (latest._max.version ?? 0) + 1, description: optionalText(formData, 'description', 800) } });
      await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'ProgramActionEvidence', entityId: created.id, action: 'uploaded', summary: `${action.title}: uploaded ${file.name}` }) });
      return created;
    });
    refreshDocuments('');
    return { success: `${evidence.name} was added to the program action.` };
  } catch (error) {
    if (storedKey) await removePrivateUpload(storedKey);
    return { error: error instanceof Error ? error.message : 'Upload failed.' };
  }
}

export async function reviewProgramEvidenceAction(formData: FormData) {
  const session = await requireSession();
  if (!isProgramRole(session.user.role)) throw new Error('Forbidden');
  const id = requiredText(formData, 'programEvidenceId', 64);
  const status = enumValue(DeliverableStatus, formData.get('status'), 'status');
  const decisions: DeliverableStatus[] = [DeliverableStatus.APPROVED, DeliverableStatus.NEEDS_REVISION, DeliverableStatus.ARCHIVED];
  if (!decisions.includes(status)) throw new Error('Select a valid decision.');
  const evidence = await prisma.programActionEvidence.findUniqueOrThrow({ where: { id }, include: { action: { select: { title: true } } } });
  await prisma.$transaction(async (tx) => {
    await tx.programActionEvidence.update({ where: { id }, data: { status, reviewerId: session.user.id, feedback: optionalText(formData, 'feedback', 1500), reviewedAt: new Date() } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'ProgramActionEvidence', entityId: id, action: 'reviewed', summary: `${evidence.action.title}: evidence marked ${status.replaceAll('_', ' ').toLowerCase()}` }) });
  });
  revalidatePath('/program');
  revalidatePath('/documents');
}
