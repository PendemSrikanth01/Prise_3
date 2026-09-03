'use server';

import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { optionalText, requiredText } from '@/lib/form';
import { isProgramRole, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { removePrivateUpload, storePrivateUpload } from '@/lib/uploads';

export type ResourceActionState = { error?: string; success?: string } | undefined;

function mayPublish(role: Role) {
  return isProgramRole(role) || role === Role.MENTOR;
}

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
    return url.toString();
  } catch {
    throw new Error('Use a complete http or https URL.');
  }
}

export async function createResourceAction(_: ResourceActionState, formData: FormData): Promise<ResourceActionState> {
  let storedKey: string | null = null;
  try {
    const session = await requireSession();
    if (!mayPublish(session.user.role)) return { error: 'Only mentors and the program team can add resources.' };
    const title = requiredText(formData, 'title', 180);
    const externalUrl = safeExternalUrl(optionalText(formData, 'externalUrl', 1200));
    const file = formData.get('file');
    const hasFile = file instanceof File && file.size > 0;
    if (!hasFile && !externalUrl) return { error: 'Add either a file or a web link.' };
    if (hasFile && externalUrl) return { error: 'Add one source at a time: a file or a web link.' };

    const phaseRaw = optionalText(formData, 'phase', 2);
    const phase = phaseRaw ? Number(phaseRaw) : null;
    if (phase !== null && (!Number.isInteger(phase) || phase < 1 || phase > 8)) return { error: 'Phase must be between 1 and 8.' };
    const stored = hasFile ? await storePrivateUpload(file as File) : null;
    storedKey = stored?.storageKey ?? null;

    const resource = await prisma.$transaction(async (tx) => {
      const created = await tx.resource.create({ data: {
        title,
        description: optionalText(formData, 'description', 800),
        category: optionalText(formData, 'category', 80),
        phase,
        externalUrl,
        storageKey: stored?.storageKey,
        fileName: hasFile ? (file as File).name.slice(0, 240) : null,
        mimeType: stored?.mimeType,
        sizeBytes: stored?.sizeBytes,
        uploaderId: session.user.id,
      } });
      await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Resource', entityId: created.id, action: 'published', summary: `Published resource: ${title}` }) });
      return created;
    });
    revalidatePath('/resources');
    return { success: `${resource.title} is now available to the workspace.` };
  } catch (error) {
    if (storedKey) await removePrivateUpload(storedKey);
    return { error: error instanceof Error ? error.message : 'Resource could not be added.' };
  }
}

export async function updateResourceAction(_: ResourceActionState, formData: FormData): Promise<ResourceActionState> {
  try {
    const session = await requireSession();
    if (!mayPublish(session.user.role)) return { error: 'Only mentors and the program team can edit resources.' };
    const id = requiredText(formData, 'resourceId', 64);
    const resource = await prisma.resource.findFirstOrThrow({ where: { id, isArchived: false }, select: { id: true, title: true, uploaderId: true } });
    // Only the original uploader or a program-role user may update metadata.
    if (!isProgramRole(session.user.role) && resource.uploaderId !== session.user.id) return { error: 'You can only edit resources you published.' };
    const title = requiredText(formData, 'title', 180);
    const externalUrl = safeExternalUrl(optionalText(formData, 'externalUrl', 1200));
    const phaseRaw = optionalText(formData, 'phase', 2);
    const phase = phaseRaw ? Number(phaseRaw) : null;
    if (phase !== null && (!Number.isInteger(phase) || phase < 1 || phase > 8)) return { error: 'Phase must be between 1 and 8.' };
    await prisma.$transaction(async (tx) => {
      await tx.resource.update({ where: { id }, data: { title, description: optionalText(formData, 'description', 800), category: optionalText(formData, 'category', 80), phase, externalUrl } });
      await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Resource', entityId: id, action: 'updated', summary: `Updated resource: ${title}` }) });
    });
    revalidatePath('/resources');
    return { success: `${title} has been updated.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Resource could not be updated.' };
  }
}

export async function archiveResourceAction(formData: FormData) {
  const session = await requireSession();
  if (!isProgramRole(session.user.role)) throw new Error('Only the program team can archive resources.');
  const id = requiredText(formData, 'resourceId', 64);
  const resource = await prisma.resource.findFirstOrThrow({ where: { id, isArchived: false }, select: { id: true, title: true } });
  await prisma.$transaction(async (tx) => {
    await tx.resource.update({ where: { id }, data: { isArchived: true } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Resource', entityId: id, action: 'archived', summary: `Archived resource: ${resource.title}` }) });
  });
  revalidatePath('/resources');
}
