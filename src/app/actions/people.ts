'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { Role } from '@prisma/client';
import { requirePermission } from '@/lib/auth';
import { requiredText } from '@/lib/form';
import { prisma } from '@/lib/prisma';
import { removePrivateUpload } from '@/lib/uploads';

export async function deletePersonPermanentlyAction(formData: FormData) {
  const session = await requirePermission('people:manage');
  const personId = requiredText(formData, 'personId', 64);
  if (formData.get('confirmPermanent') !== 'DELETE') throw new Error('Confirm permanent deletion before continuing.');
  if (personId === session.user.id) throw new Error('You cannot delete your own account.');
  const deleteLinkedStartup = formData.get('deleteLinkedStartup') === 'on';
  const disabledPasswordHash = await hash(randomBytes(32).toString('base64url'), 12);

  const storageKeys = await prisma.$transaction(async (tx) => {
    const person = await tx.person.findUniqueOrThrow({
      where: { id: personId },
      select: { id: true, name: true, email: true, role: true, isActive: true, founderOfStartupId: true, profilePhotoKey: true },
    });
    if (person.role === Role.PROGRAM_LEAD && person.isActive) {
      const otherLeads = await tx.person.count({ where: { id: { not: personId }, role: Role.PROGRAM_LEAD, isActive: true } });
      if (otherLeads === 0) throw new Error('The final active Program Lead cannot be deleted.');
    }

    const [personalFiles, participantSessions] = await Promise.all([
      Promise.all([
        tx.onboardingDocument.findMany({ where: { uploaderId: personId }, select: { storageKey: true } }),
        tx.deliverable.findMany({ where: { uploaderId: personId }, select: { storageKey: true } }),
        tx.resource.findMany({ where: { uploaderId: personId }, select: { storageKey: true } }),
        tx.programActionEvidence.findMany({ where: { uploaderId: personId }, select: { storageKey: true } }),
      ]),
      tx.session.findMany({ where: { participantIds: { has: personId } }, select: { id: true, participantIds: true } }),
    ]);

    const keys = new Set<string>([person.profilePhotoKey, ...personalFiles.flat().map(({ storageKey }) => storageKey)].filter((key): key is string => Boolean(key)));
    const linkedStartupId = person.role === Role.FOUNDER ? person.founderOfStartupId : null;

    await Promise.all(participantSessions.map(({ id, participantIds }) => tx.session.update({ where: { id }, data: { participantIds: participantIds.filter((id) => id !== personId) } })));

    if (deleteLinkedStartup && linkedStartupId) {
      const startup = await tx.startup.findUnique({
        where: { id: linkedStartupId },
        select: {
          logoStorageKey: true,
          profilePdfStorageKey: true,
          onboardingItems: { select: { documents: { select: { storageKey: true } } } },
          milestones: { select: { deliverables: { select: { storageKey: true } } } },
        },
      });
      if (startup) {
        [startup.logoStorageKey, startup.profilePdfStorageKey, ...startup.onboardingItems.flatMap(({ documents }) => documents.map(({ storageKey }) => storageKey)), ...startup.milestones.flatMap(({ deliverables }) => deliverables.map(({ storageKey }) => storageKey))].forEach((key) => { if (key) keys.add(key); });
      }
      await tx.person.update({ where: { id: personId }, data: { founderOfStartupId: null } });
      await tx.task.deleteMany({ where: { startupId: linkedStartupId } });
      await tx.milestone.deleteMany({ where: { startupId: linkedStartupId } });
      await tx.onboardingItem.deleteMany({ where: { startupId: linkedStartupId } });
      await tx.supportRequest.deleteMany({ where: { startupId: linkedStartupId } });
      await tx.session.deleteMany({ where: { startupId: linkedStartupId } });
      await tx.paymentInstallment.deleteMany({ where: { startupId: linkedStartupId } });
      await tx.startupAssignment.deleteMany({ where: { startupId: linkedStartupId } });
      await tx.startupMembership.deleteMany({ where: { startupId: linkedStartupId } });
      await tx.investorStartupShare.deleteMany({ where: { startupId: linkedStartupId } });
      await tx.mentorMatchPreference.deleteMany({ where: { startupId: linkedStartupId } });
      await tx.startup.update({
        where: { id: linkedStartupId },
        data: {
          sNo: null,
          name: `Deleted startup ${linkedStartupId.slice(-8)}`,
          founderName: 'Deleted incubatee',
          founderEmail: null,
          founderPhone: null,
          fullAddress: null,
          operationLocation: null,
          state: null,
          sector: null,
          legalStructure: null,
          actualFee: null,
          agreedFee: null,
          agreedFeeRemarks: null,
          totalFeePaid: null,
          documentFolderLink: null,
          logoStorageKey: null,
          logoMimeType: null,
          profilePdfStorageKey: null,
          profilePdfName: null,
          profilePdfSizeBytes: null,
          status: 'WITHDRAWN',
          healthStatus: null,
        },
      });
    } else if (linkedStartupId) {
      await tx.startup.update({ where: { id: linkedStartupId }, data: { founderName: 'Incubatee unassigned', founderEmail: null, founderPhone: null } });
    }

    await tx.onboardingDocument.deleteMany({ where: { uploaderId: personId } });
    await tx.deliverable.deleteMany({ where: { uploaderId: personId } });
    await tx.resource.deleteMany({ where: { uploaderId: personId } });
    await tx.programActionEvidence.deleteMany({ where: { uploaderId: personId } });
    await tx.taskComment.deleteMany({ where: { authorId: personId } });
    await tx.supportMessage.deleteMany({ where: { authorId: personId } });
    await tx.milestoneReview.deleteMany({ where: { reviewerId: personId } });
    await tx.milestoneStakeholderStatus.deleteMany({ where: { updatedById: personId } });
    await tx.notification.deleteMany({ where: { OR: [{ recipientId: personId }, { recipientEmail: { equals: person.email, mode: 'insensitive' } }] } });

    await tx.onboardingItem.updateMany({ where: { reviewedById: personId }, data: { reviewedById: null } });
    await tx.milestone.updateMany({ where: { reviewerId: personId }, data: { reviewerId: null } });
    await tx.task.updateMany({ where: { assigneeId: personId }, data: { assigneeId: null } });
    await tx.task.updateMany({ where: { createdById: personId }, data: { createdById: null } });
    await tx.deliverable.updateMany({ where: { reviewerId: personId }, data: { reviewerId: null } });
    await tx.programAction.updateMany({ where: { ownerId: personId }, data: { ownerId: null } });
    await tx.programAction.updateMany({ where: { createdById: personId }, data: { createdById: null } });
    await tx.programAction.updateMany({ where: { approvedById: personId }, data: { approvedById: null, approvedAt: null } });
    await tx.programActionSubtask.updateMany({ where: { ownerId: personId }, data: { ownerId: null } });
    await tx.programActionEvidence.updateMany({ where: { reviewerId: personId }, data: { reviewerId: null } });
    await tx.supportRequest.updateMany({ where: { requestedById: personId }, data: { requestedById: null } });
    await tx.supportRequest.updateMany({ where: { assignedToId: personId }, data: { assignedToId: null } });
    await tx.session.updateMany({ where: { facilitatorId: personId }, data: { facilitatorId: null } });
    await tx.attendanceRecord.updateMany({ where: { recordedById: personId }, data: { recordedById: null } });

    await tx.startupAssignment.deleteMany({ where: { personId } });
    await tx.startupMembership.deleteMany({ where: { personId } });
    await tx.investorStartupShare.deleteMany({ where: { investorId: personId } });
    await tx.mentorMatchPreference.deleteMany({ where: { OR: [{ mentorId: personId }, { submittedById: personId }] } });
    await tx.mentorAvailability.deleteMany({ where: { mentorId: personId } });
    await tx.supportParticipant.deleteMany({ where: { personId } });
    await tx.googleCalendarConnection.deleteMany({ where: { personId } });
    await tx.authSession.deleteMany({ where: { personId } });
    await tx.passwordResetToken.deleteMany({ where: { personId } });
    await tx.person.update({
      where: { id: personId },
      data: {
        name: 'Deleted user',
        email: `${personId}@deleted.invalid`,
        phone: null,
        isActive: false,
        mustChangePassword: false,
        lastLoginAt: null,
        passwordHash: disabledPasswordHash,
        organization: null,
        designation: null,
        professionalBio: null,
        professionalDomain: null,
        mentorLocation: null,
        mentoringFrequency: null,
        linkedinUrl: null,
        expertiseAreas: [],
        preferredSectors: [],
        languages: [],
        yearsExperience: null,
        profilePhotoKey: null,
        profilePhotoMimeType: null,
        maxStartupCapacity: 0,
        acceptingMentees: false,
        founderOfStartupId: null,
      },
    });
    return [...keys];
  });

  await Promise.all(storageKeys.map((key) => removePrivateUpload(key)));
  revalidatePath('/settings');
  revalidatePath('/directory');
  revalidatePath('/audit');
  revalidatePath('/startups');
  revalidatePath('/');
}
