import type { Prisma } from '@prisma/client';

type PersonCleanupInput = {
  id: string;
  email: string;
  profilePhotoKey: string | null;
};

export async function clearInactivePersonData(tx: Prisma.TransactionClient, person: PersonCleanupInput) {
  const [uploadedFiles, participantSessions] = await Promise.all([
    Promise.all([
      tx.onboardingDocument.findMany({ where: { uploaderId: person.id }, select: { storageKey: true } }),
      tx.deliverable.findMany({ where: { uploaderId: person.id }, select: { storageKey: true } }),
      tx.resource.findMany({ where: { uploaderId: person.id }, select: { storageKey: true } }),
      tx.programActionEvidence.findMany({ where: { uploaderId: person.id }, select: { storageKey: true } }),
    ]),
    tx.session.findMany({ where: { participantIds: { has: person.id } }, select: { id: true, participantIds: true } }),
  ]);
  const storageKeys = new Set<string>([person.profilePhotoKey, ...uploadedFiles.flat().map(({ storageKey }) => storageKey)].filter((key): key is string => Boolean(key)));

  await Promise.all(participantSessions.map(({ id, participantIds }) => tx.session.update({ where: { id }, data: { participantIds: participantIds.filter((participantId) => participantId !== person.id) } })));

  await tx.onboardingDocument.deleteMany({ where: { uploaderId: person.id } });
  await tx.deliverable.deleteMany({ where: { uploaderId: person.id } });
  await tx.resource.deleteMany({ where: { uploaderId: person.id } });
  await tx.programActionEvidence.deleteMany({ where: { uploaderId: person.id } });
  await tx.taskComment.deleteMany({ where: { authorId: person.id } });
  await tx.supportMessage.deleteMany({ where: { authorId: person.id } });
  await tx.milestoneReview.deleteMany({ where: { reviewerId: person.id } });
  await tx.milestoneStakeholderStatus.deleteMany({ where: { updatedById: person.id } });
  await tx.notification.deleteMany({ where: { OR: [{ recipientId: person.id }, { recipientEmail: { equals: person.email, mode: 'insensitive' } }] } });

  await tx.onboardingItem.updateMany({ where: { reviewedById: person.id }, data: { reviewedById: null } });
  await tx.milestone.updateMany({ where: { reviewerId: person.id }, data: { reviewerId: null } });
  await tx.task.updateMany({ where: { assigneeId: person.id }, data: { assigneeId: null } });
  await tx.task.updateMany({ where: { createdById: person.id }, data: { createdById: null } });
  await tx.deliverable.updateMany({ where: { reviewerId: person.id }, data: { reviewerId: null } });
  await tx.programAction.updateMany({ where: { ownerId: person.id }, data: { ownerId: null } });
  await tx.programAction.updateMany({ where: { createdById: person.id }, data: { createdById: null } });
  await tx.programAction.updateMany({ where: { approvedById: person.id }, data: { approvedById: null, approvedAt: null } });
  await tx.programActionSubtask.updateMany({ where: { ownerId: person.id }, data: { ownerId: null } });
  await tx.programActionEvidence.updateMany({ where: { reviewerId: person.id }, data: { reviewerId: null } });
  await tx.supportRequest.updateMany({ where: { requestedById: person.id }, data: { requestedById: null } });
  await tx.supportRequest.updateMany({ where: { assignedToId: person.id }, data: { assignedToId: null } });
  await tx.session.updateMany({ where: { facilitatorId: person.id }, data: { facilitatorId: null } });
  await tx.attendanceRecord.updateMany({ where: { recordedById: person.id }, data: { recordedById: null } });

  await tx.startupAssignment.deleteMany({ where: { personId: person.id } });
  await tx.startupMembership.deleteMany({ where: { personId: person.id } });
  await tx.investorStartupShare.deleteMany({ where: { investorId: person.id } });
  await tx.mentorMatchPreference.deleteMany({ where: { OR: [{ mentorId: person.id }, { submittedById: person.id }] } });
  await tx.mentorAvailability.deleteMany({ where: { mentorId: person.id } });
  await tx.supportParticipant.deleteMany({ where: { personId: person.id } });
  await tx.googleCalendarConnection.deleteMany({ where: { personId: person.id } });
  await tx.authSession.deleteMany({ where: { personId: person.id } });
  await tx.passwordResetToken.deleteMany({ where: { personId: person.id } });
  await tx.person.update({
    where: { id: person.id },
    data: {
      founderOfStartupId: null,
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
      acceptingMentees: false,
    },
  });

  return [...storageKeys];
}
