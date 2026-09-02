'use server';

import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { isProgramRole, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { removePrivateUpload, storePrivateUpload } from '@/lib/uploads';

export type StartupProfileFeedback = { status: 'idle' | 'success' | 'error'; message: string };

function refreshStartupProfile(startupId: string) {
  revalidatePath('/directory');
  revalidatePath(`/startups/${startupId}`);
  revalidatePath(`/startups/${startupId}/profile`);
}

function requireProgramTeam(role: Parameters<typeof isProgramRole>[0]) {
  if (!isProgramRole(role)) throw new Error('Only the Program Team can manage incubatee profile PDFs.');
}

export async function uploadStartupProfilePdfAction(_previous: StartupProfileFeedback, formData: FormData): Promise<StartupProfileFeedback> {
  try {
    const session = await requireSession();
    requireProgramTeam(session.user.role);
    const startupId = String(formData.get('startupId') ?? '');
    const file = formData.get('profilePdf');
    if (!startupId) throw new Error('Startup is required.');
    if (!(file instanceof File) || !file.size) throw new Error('Choose a PDF to upload.');
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) throw new Error('The incubatee profile must be a PDF.');

    const previous = await prisma.startup.findUniqueOrThrow({ where: { id: startupId }, select: { name: true, profilePdfStorageKey: true, profilePdfName: true } });
    const stored = await storePrivateUpload(file);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.startup.update({ where: { id: startupId }, data: { profilePdfStorageKey: stored.storageKey, profilePdfName: file.name, profilePdfSizeBytes: stored.sizeBytes } });
        await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Startup', entityId: startupId, action: 'startup_profile_pdf_updated', summary: `${previous.name}: incubatee profile PDF updated`, meta: { previousName: previous.profilePdfName, newName: file.name } }) });
      });
    } catch (error) {
      await removePrivateUpload(stored.storageKey);
      throw error;
    }
    if (previous.profilePdfStorageKey) await removePrivateUpload(previous.profilePdfStorageKey);
    refreshStartupProfile(startupId);
    return { status: 'success', message: 'Profile PDF is ready to view and download.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Profile PDF could not be uploaded.' };
  }
}

export async function removeStartupProfilePdfAction(formData: FormData) {
  const session = await requireSession();
  requireProgramTeam(session.user.role);
  const startupId = String(formData.get('startupId') ?? '');
  if (!startupId) throw new Error('Startup is required.');
  const previous = await prisma.startup.findUniqueOrThrow({ where: { id: startupId }, select: { name: true, profilePdfStorageKey: true, profilePdfName: true } });
  if (!previous.profilePdfStorageKey) return;
  await prisma.$transaction(async (tx) => {
    await tx.startup.update({ where: { id: startupId }, data: { profilePdfStorageKey: null, profilePdfName: null, profilePdfSizeBytes: null } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Startup', entityId: startupId, action: 'startup_profile_pdf_removed', summary: `${previous.name}: incubatee profile PDF removed`, meta: { previousName: previous.profilePdfName } }) });
  });
  await removePrivateUpload(previous.profilePdfStorageKey);
  refreshStartupProfile(startupId);
}
