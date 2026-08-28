'use server';

import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { optionalText, requiredText } from '@/lib/form';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { removePrivateUpload, storePrivateUpload } from '@/lib/uploads';

export type ProfileFeedback = { status: 'idle' | 'success' | 'error'; message: string };

function refreshProfile(personId: string) {
  revalidatePath('/settings');
  revalidatePath('/directory');
  revalidatePath('/');
  revalidatePath(`/mentors/${personId}`);
  revalidatePath('/mentor-profile');
}

export async function updateMyProfileAction(_previous: ProfileFeedback, formData: FormData): Promise<ProfileFeedback> {
  try {
    const session = await requireSession();
    const name = requiredText(formData, 'name', 160);
    const phone = optionalText(formData, 'phone', 40);
    const designation = optionalText(formData, 'designation', 180);
    const organization = optionalText(formData, 'organization', 180);
    const professionalBio = optionalText(formData, 'professionalBio', 1000);
    await prisma.$transaction(async (tx) => {
      await tx.person.update({ where: { id: session.user.id }, data: { name, phone, designation, organization, professionalBio } });
      await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Person', entityId: session.user.id, action: 'profile_updated', summary: `${name}: updated profile details` }) });
    });
    refreshProfile(session.user.id);
    return { status: 'success', message: 'Profile updated successfully.' };
  } catch (error) { return { status: 'error', message: error instanceof Error ? error.message : 'Profile could not be updated.' }; }
}

export async function updateMyProfilePhotoAction(_previous: ProfileFeedback, formData: FormData): Promise<ProfileFeedback> {
  try {
    const session = await requireSession();
    const file = formData.get('photo');
    if (!(file instanceof File) || !file.size) throw new Error('Choose a JPG, PNG or WebP profile photo.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Profile photos must be JPG, PNG or WebP.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Profile photos must be 5 MB or smaller.');
    const previous = await prisma.person.findUniqueOrThrow({ where: { id: session.user.id }, select: { profilePhotoKey: true } });
    const stored = await storePrivateUpload(file);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.person.update({ where: { id: session.user.id }, data: { profilePhotoKey: stored.storageKey, profilePhotoMimeType: stored.mimeType } });
        await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Person', entityId: session.user.id, action: 'profile_photo_updated', summary: `${session.user.name}: updated profile photo` }) });
      });
    } catch (error) { await removePrivateUpload(stored.storageKey); throw error; }
    if (previous.profilePhotoKey) await removePrivateUpload(previous.profilePhotoKey);
    refreshProfile(session.user.id);
    return { status: 'success', message: 'Profile photo updated successfully.' };
  } catch (error) { return { status: 'error', message: error instanceof Error ? error.message : 'Profile photo could not be updated.' }; }
}
