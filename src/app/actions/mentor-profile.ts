'use server';

import { MentorMeetingMode, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { enumValue, optionalText, requiredText } from '@/lib/form';
import { requireSession } from '@/lib/auth';
import { canEditMentorProfile, parseTagList, parseYearsExperience, timeToMinute } from '@/lib/mentor-profile';
import { prisma } from '@/lib/prisma';
import { removePrivateUpload, storePrivateUpload } from '@/lib/uploads';

async function editableMentor(mentorId: string) {
  const actor = await requireSession();
  if (!canEditMentorProfile(actor.user, mentorId)) throw new Error('You cannot edit this mentor profile.');
  const mentor = await prisma.person.findFirstOrThrow({ where: { id: mentorId, role: Role.MENTOR }, select: { id: true, name: true } });
  return { actor, mentor };
}

function refreshMentorProfile(mentorId: string) {
  revalidatePath('/mentors');
  revalidatePath(`/mentors/${mentorId}`);
  revalidatePath('/mentor-profile');
}

export async function updateMentorProfileAction(formData: FormData) {
  const mentorId = requiredText(formData, 'mentorId', 64);
  const { actor, mentor } = await editableMentor(mentorId);
  const update = {
    organization: optionalText(formData, 'organization', 180),
    designation: optionalText(formData, 'designation', 180),
    professionalBio: optionalText(formData, 'professionalBio', 1500),
    expertiseAreas: parseTagList(formData.get('expertiseAreas')),
    preferredSectors: parseTagList(formData.get('preferredSectors')),
    languages: parseTagList(formData.get('languages'), 8),
    yearsExperience: parseYearsExperience(formData.get('yearsExperience')),
  };
  await prisma.$transaction(async (tx) => {
    await tx.person.update({ where: { id: mentorId }, data: update });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'Person', entityId: mentorId, action: 'mentor_profile_updated', summary: `Updated mentor profile: ${mentor.name}` }) });
  });
  refreshMentorProfile(mentorId);
}

export async function updateMentorPhotoAction(formData: FormData) {
  const mentorId = requiredText(formData, 'mentorId', 64);
  const { actor, mentor } = await editableMentor(mentorId);
  const file = formData.get('photo');
  if (!(file instanceof File) || !file.size) throw new Error('Choose a JPG, PNG or WebP profile photo.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Profile photos must be JPG, PNG or WebP.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile photos must be 5 MB or smaller.');
  const previous = await prisma.person.findUniqueOrThrow({ where: { id: mentorId }, select: { profilePhotoKey: true } });
  const stored = await storePrivateUpload(file);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.person.update({ where: { id: mentorId }, data: { profilePhotoKey: stored.storageKey, profilePhotoMimeType: stored.mimeType } });
      await tx.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'Person', entityId: mentorId, action: 'mentor_photo_updated', summary: `Updated mentor photo: ${mentor.name}` }) });
    });
  } catch (error) {
    await removePrivateUpload(stored.storageKey);
    throw error;
  }
  if (previous.profilePhotoKey) await removePrivateUpload(previous.profilePhotoKey);
  refreshMentorProfile(mentorId);
}

export async function addMentorAvailabilityAction(formData: FormData) {
  const mentorId = requiredText(formData, 'mentorId', 64);
  const { actor, mentor } = await editableMentor(mentorId);
  const dayOfWeek = Number(formData.get('dayOfWeek'));
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) throw new Error('Choose a valid weekday.');
  const startMinute = timeToMinute(formData.get('startTime'));
  const endMinute = timeToMinute(formData.get('endTime'));
  if (endMinute <= startMinute) throw new Error('End time must be after start time.');
  if (endMinute - startMinute > 8 * 60) throw new Error('One availability window cannot exceed 8 hours.');
  const mode = enumValue(MentorMeetingMode, formData.get('mode'), 'mode');
  await prisma.$transaction(async (tx) => {
    const slot = await tx.mentorAvailability.upsert({
      where: { mentorId_dayOfWeek_startMinute_endMinute: { mentorId, dayOfWeek, startMinute, endMinute } },
      update: { mode, isActive: true },
      create: { mentorId, dayOfWeek, startMinute, endMinute, mode },
    });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'MentorAvailability', entityId: slot.id, action: 'created', summary: `${mentor.name}: added recurring availability` }) });
  });
  refreshMentorProfile(mentorId);
}

export async function removeMentorAvailabilityAction(formData: FormData) {
  const availabilityId = requiredText(formData, 'availabilityId', 64);
  const slot = await prisma.mentorAvailability.findUniqueOrThrow({ where: { id: availabilityId }, include: { mentor: { select: { id: true, name: true } } } });
  const { actor } = await editableMentor(slot.mentorId);
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'MentorAvailability', entityId: availabilityId, action: 'deleted', summary: `${slot.mentor.name}: removed recurring availability` }) });
    await tx.mentorAvailability.delete({ where: { id: availabilityId } });
  });
  refreshMentorProfile(slot.mentorId);
}
