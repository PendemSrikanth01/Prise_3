'use server';

import { InAppNotificationKind, MentorMeetingMode, NotificationKind, NotificationTemplateKey, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { auditData } from '@/lib/audit';
import { enumValue, optionalText, requiredText } from '@/lib/form';
import { requireSession } from '@/lib/auth';
import { canEditMentorProfile, parseTagList, parseYearsExperience, timeToMinute } from '@/lib/mentor-profile';
import { prisma } from '@/lib/prisma';
import { queueTemplatedNotification } from '@/lib/notification-automation';
import { priseTeamEmails } from '@/lib/prise-team';
import { deliverPushForEventPrefix } from '@/lib/push-notifications';
import { removePrivateUpload, storePrivateUpload } from '@/lib/uploads';

async function editableMentor(mentorId: string) {
  const actor = await requireSession();
  if (!canEditMentorProfile(actor.user, mentorId)) throw new Error('You cannot edit this mentor profile.');
  const mentor = await prisma.person.findFirstOrThrow({ where: { id: mentorId, role: Role.MENTOR }, select: { id: true, name: true } });
  return { actor, mentor };
}

function refreshMentorProfile(mentorId: string) {
  revalidatePath('/directory');
  revalidatePath('/mentors');
  revalidatePath(`/mentors/${mentorId}`);
  revalidatePath('/mentor-profile');
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function availabilityText(slots: Array<{ dayOfWeek: number; startMinute: number; endMinute: number; mode: MentorMeetingMode }>) {
  const time = (minute: number) => {
    const hour = Math.floor(minute / 60);
    const value = hour % 12 || 12;
    return `${value}:${String(minute % 60).padStart(2, '0')} ${hour >= 12 ? 'pm' : 'am'}`;
  };
  return slots.map((slot) => `${DAYS[slot.dayOfWeek]} ${time(slot.startMinute)}–${time(slot.endMinute)} (${slot.mode.toLowerCase()})`).join('; ');
}

export async function updateMentorProfileAction(formData: FormData) {
  const mentorId = requiredText(formData, 'mentorId', 64);
  const { actor, mentor } = await editableMentor(mentorId);
  const linkedinUrl = optionalText(formData, 'linkedinUrl', 500);
  if (linkedinUrl && !/^https:\/\/(?:[a-z0-9-]+\.)?linkedin\.com\//i.test(linkedinUrl)) throw new Error('Enter a valid LinkedIn profile URL.');
  const update = {
    organization: optionalText(formData, 'organization', 180),
    designation: optionalText(formData, 'designation', 180),
    professionalBio: optionalText(formData, 'professionalBio', 1500),
    professionalDomain: optionalText(formData, 'professionalDomain', 240),
    mentorLocation: optionalText(formData, 'mentorLocation', 180),
    mentoringFrequency: optionalText(formData, 'mentoringFrequency', 120),
    linkedinUrl,
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
    await tx.person.update({ where: { id: mentorId }, data: { availabilityPublishedAt: null } });
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
    await tx.person.update({ where: { id: slot.mentorId }, data: { availabilityPublishedAt: null } });
  });
  refreshMentorProfile(slot.mentorId);
}

export async function publishMentorAvailabilityAction(formData: FormData) {
  const mentorId = requiredText(formData, 'mentorId', 64);
  const includePriseTeam = formData.get('includePriseTeam') === 'on';
  const { actor, mentor } = await editableMentor(mentorId);
  const slots = await prisma.mentorAvailability.findMany({
    where: { mentorId, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    select: { dayOfWeek: true, startMinute: true, endMinute: true, mode: true },
  });
  if (!slots.length) throw new Error('Add at least one availability window before publishing.');
  const assignments = await prisma.startupAssignment.findMany({
    where: { personId: mentorId, role: 'MENTOR' },
    select: {
      startup: {
        select: {
          id: true,
          name: true,
          founder: { select: { id: true, name: true, email: true, isActive: true } },
          memberships: { where: { isActive: true }, select: { person: { select: { id: true, name: true, email: true, isActive: true } } } },
        },
      },
    },
  });
  const publicationId = randomUUID();
  const publishedAt = new Date();
  const inAppRows = assignments.flatMap(({ startup }) => {
    const recipients = [startup.founder, ...startup.memberships.map(({ person }) => person)]
      .filter((person): person is NonNullable<typeof person> => Boolean(person?.isActive));
    return [...new Map(recipients.map((person) => [person.id, person])).values()].map((recipient) => ({
      recipientId: recipient.id,
      kind: InAppNotificationKind.MENTOR_AVAILABILITY_PUBLISHED,
      title: 'Mentor availability published',
      message: `${mentor.name} published updated availability for ${startup.name}.`,
      href: '/my-mentors',
      relatedEntityType: 'Person',
      relatedEntityId: mentorId,
      eventKey: `${publicationId}:availability:${startup.id}:${recipient.id}`,
    }));
  });
  await prisma.$transaction(async (tx) => {
    await tx.person.update({ where: { id: mentorId }, data: { availabilityPublishedAt: publishedAt } });
    if (inAppRows.length) await tx.inAppNotification.createMany({ data: inAppRows });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'Person', entityId: mentorId, action: 'mentor_availability_published', summary: `${mentor.name}: published mentoring availability to ${assignments.length} assigned startup(s)` }) });
  });

  const summary = availabilityText(slots);
  const teamCc = includePriseTeam ? priseTeamEmails() : [];
  await Promise.all(assignments.flatMap(({ startup }) => {
    const recipients = [startup.founder, ...startup.memberships.map(({ person }) => person)]
      .filter((person): person is NonNullable<typeof person> => Boolean(person?.isActive));
    const unique = [...new Map(recipients.map((person) => [person.id, person])).values()];
    return unique.map((recipient, index) => queueTemplatedNotification({
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      ccEmails: index === 0 ? teamCc : [],
      kind: NotificationKind.MENTOR_AVAILABILITY_PUBLISHED,
      templateKey: NotificationTemplateKey.MENTOR_AVAILABILITY_PUBLISHED,
      variables: {
        name: recipient.name,
        mentorName: mentor.name,
        startupName: startup.name,
        availabilitySummary: summary,
        calendarUrl: `${process.env.APP_URL || 'http://127.0.0.1:3010'}/calendar`,
      },
      relatedEntityType: 'Person',
      relatedEntityId: mentorId,
    }));
  }));
  await deliverPushForEventPrefix(publicationId);
  refreshMentorProfile(mentorId);
  revalidatePath('/my-mentors');
  revalidatePath('/notifications');
  revalidatePath('/audit');
  revalidatePath('/', 'layout');
}
