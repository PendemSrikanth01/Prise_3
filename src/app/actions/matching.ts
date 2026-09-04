'use server';

import { AssignmentRole, MatchPreferenceSource, Role, StartupStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { hasPermission, isProgramRole, requireSession, resolveFounderStartupId } from '@/lib/auth';
import { optionalText, requiredText } from '@/lib/form';
import { prisma } from '@/lib/prisma';
import { assertAllocationCandidates, normalizeAllocationIds, normalizeMatchingPreferenceIds } from '@/lib/matching';

export type MatchingFeedback = { status: 'idle' | 'success' | 'error'; message: string };

function message(error: unknown) {
  return error instanceof Error ? error.message : 'The matching preference could not be saved.';
}

export async function saveMatchingPreferencesAction(_previous: MatchingFeedback, formData: FormData): Promise<MatchingFeedback> {
  try {
    const session = await requireSession();
    const selectedIds = normalizeMatchingPreferenceIds(formData.getAll('candidateId'));
    const note = optionalText(formData, 'note', 500);

    if (session.user.role === Role.MENTOR) {
      const eligible = await prisma.startup.findMany({
        where: { id: { in: selectedIds }, status: { in: [StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION] } },
        select: { id: true },
      });
      if (eligible.length !== selectedIds.length) throw new Error('One or more incubatees are unavailable. Refresh and try again.');
      await prisma.$transaction(async (tx) => {
        await tx.mentorMatchPreference.deleteMany({ where: { source: MatchPreferenceSource.MENTOR, mentorId: session.user.id } });
        await tx.mentorMatchPreference.createMany({ data: selectedIds.map((startupId, index) => ({ source: MatchPreferenceSource.MENTOR, mentorId: session.user.id, startupId, rank: index + 1, note, submittedById: session.user.id })) });
        await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'MentorMatchPreference', entityId: session.user.id, action: 'mentor_preferences_submitted', summary: `Submitted ${selectedIds.length} ranked incubatee preference${selectedIds.length === 1 ? '' : 's'}` }) });
      });
    } else if (session.user.role === Role.FOUNDER) {
      const startupId = await resolveFounderStartupId(session.user);
      if (!startupId) throw new Error('Your account must be connected to an incubatee profile first.');
      const eligible = await prisma.person.findMany({ where: { id: { in: selectedIds }, role: Role.MENTOR, isActive: true }, select: { id: true } });
      if (eligible.length !== selectedIds.length) throw new Error('One or more mentors are unavailable. Refresh and try again.');
      await prisma.$transaction(async (tx) => {
        await tx.mentorMatchPreference.deleteMany({ where: { source: MatchPreferenceSource.INCUBATEE, startupId } });
        await tx.mentorMatchPreference.createMany({ data: selectedIds.map((mentorId, index) => ({ source: MatchPreferenceSource.INCUBATEE, mentorId, startupId, rank: index + 1, note, submittedById: session.user.id })) });
        await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'MentorMatchPreference', entityId: startupId, action: 'incubatee_preferences_submitted', summary: `Submitted ${selectedIds.length} ranked mentor preference${selectedIds.length === 1 ? '' : 's'}` }) });
      });
    } else {
      throw new Error('Only mentors and incubatees can submit matching preferences.');
    }

    revalidatePath('/directory');
    revalidatePath('/settings');
    revalidatePath('/audit');
    revalidatePath('/mapping');
    return { status: 'success', message: 'Preferences submitted successfully.' };
  } catch (error) {
    return { status: 'error', message: message(error) };
  }
}

export async function finalizeMentorMatchAction(formData: FormData) {
  const session = await requireSession();
  if (session.user.role !== Role.PROGRAM_LEAD && session.user.role !== Role.PROGRAM_TEAM) throw new Error('Forbidden');
  const startupId = requiredText(formData, 'startupId', 64);
  const mentorId = requiredText(formData, 'mentorId', 64);
  const [startup, mentor] = await Promise.all([
    prisma.startup.findUniqueOrThrow({ where: { id: startupId }, select: { name: true } }),
    prisma.person.findFirstOrThrow({ where: { id: mentorId, role: Role.MENTOR, isActive: true }, select: { name: true } }),
  ]);
  await prisma.$transaction(async (tx) => {
    const assignment = await tx.startupAssignment.upsert({
      where: { startupId_personId_role: { startupId, personId: mentorId, role: AssignmentRole.MENTOR } },
      update: {},
      create: { startupId, personId: mentorId, role: AssignmentRole.MENTOR },
    });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'StartupAssignment', entityId: assignment.id, action: 'mentor_match_finalized', summary: `Finalized ${mentor.name} as mentor for ${startup.name}` }) });
  });
  revalidatePath('/settings');
  revalidatePath('/directory');
  revalidatePath('/mapping');
  revalidatePath('/startups');
  revalidatePath(`/startups/${startupId}`);
  revalidatePath('/audit');
}

export async function unfinalizeMentorMatchAction(formData: FormData) {
  const session = await requireSession();
  if (!isProgramRole(session.user.role)) throw new Error('Forbidden');
  const startupId = requiredText(formData, 'startupId', 64);
  const mentorId = requiredText(formData, 'mentorId', 64);
  const assignment = await prisma.startupAssignment.findFirst({
    where: { startupId, personId: mentorId, role: AssignmentRole.MENTOR },
    include: { person: { select: { name: true } }, startup: { select: { name: true } } },
  });
  if (!assignment) throw new Error('No finalized assignment found for this pair.');
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'StartupAssignment', entityId: assignment.id, action: 'mentor_match_reverted', summary: `Reverted ${assignment.person.name} as mentor for ${assignment.startup.name}` }) });
    await tx.startupAssignment.delete({ where: { id: assignment.id } });
  });
  revalidatePath('/settings');
  revalidatePath('/directory');
  revalidatePath('/mapping');
  revalidatePath('/startups');
  revalidatePath(`/startups/${startupId}`);
  revalidatePath('/audit');
}

export async function saveStartupMentorAllocationsAction(_previous: MatchingFeedback, formData: FormData): Promise<MatchingFeedback> {
  try {
    const session = await requireSession();
    if (!isProgramRole(session.user.role)) throw new Error('Forbidden');
    const startupId = requiredText(formData, 'startupId', 64);
    const mentorIds = normalizeAllocationIds(formData.getAll('mentorId'));

    const startup = await prisma.startup.findFirstOrThrow({ where: { id: startupId, status: { in: [StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION] } }, select: { name: true } });
    const verifiedMentors = mentorIds.length > 0
      ? await prisma.person.findMany({ where: { id: { in: mentorIds }, role: Role.MENTOR, isActive: true }, select: { id: true, name: true } })
      : [];

    assertAllocationCandidates(mentorIds, verifiedMentors);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.startupAssignment.findMany({
        where: { startupId, role: AssignmentRole.MENTOR },
        select: { id: true, personId: true },
      });
      const existingPersonIds = new Set(existing.map((e) => e.personId));
      const targetPersonIds = new Set(verifiedMentors.map((m) => m.id));

      const toRemove = existing.filter((e) => !targetPersonIds.has(e.personId));
      if (toRemove.length > 0) {
        await tx.startupAssignment.deleteMany({
          where: { id: { in: toRemove.map((e) => e.id) } },
        });
      }

      const toAdd = verifiedMentors.filter((m) => !existingPersonIds.has(m.id));
      if (toAdd.length > 0) {
        await tx.startupAssignment.createMany({
          data: toAdd.map((m) => ({ startupId, personId: m.id, role: AssignmentRole.MENTOR })),
        });
      }

      const mentorNames = verifiedMentors.map((m) => m.name).join(', ') || 'none';
      await tx.activityLog.create({
        data: auditData({
          actor: session.user,
          startupId,
          entityType: 'StartupAssignment',
          entityId: startupId,
          action: 'mentor_allocations_saved',
          summary: `Updated mentor allocations for ${startup.name}: ${mentorNames} (${verifiedMentors.length} assigned)`,
        }),
      });
    });

    revalidatePath('/directory');
    revalidatePath('/settings');
    revalidatePath('/startups');
    revalidatePath(`/startups/${startupId}`);
    revalidatePath('/audit');
    revalidatePath('/mapping');
    return { status: 'success', message: `Saved ${verifiedMentors.length} mentor(s) for ${startup.name}. Use Email workspace to notify the participants.` };
  } catch (error) {
    return { status: 'error', message: message(error) };
  }
}

export async function saveMentorStartupAllocationsAction(_previous: MatchingFeedback, formData: FormData): Promise<MatchingFeedback> {
  try {
    const session = await requireSession();
    if (!isProgramRole(session.user.role)) throw new Error('Forbidden');
    const mentorId = requiredText(formData, 'mentorId', 64);
    const startupIds = normalizeAllocationIds(formData.getAll('startupId'));

    const mentor = await prisma.person.findFirstOrThrow({ where: { id: mentorId, role: Role.MENTOR, isActive: true }, select: { name: true } });
    const verifiedStartups = startupIds.length > 0
      ? await prisma.startup.findMany({ where: { id: { in: startupIds }, status: { in: [StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION] } }, select: { id: true, name: true } })
      : [];

    assertAllocationCandidates(startupIds, verifiedStartups);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.startupAssignment.findMany({
        where: { personId: mentorId, role: AssignmentRole.MENTOR },
        select: { id: true, startupId: true },
      });
      const existingStartupIds = new Set(existing.map((e) => e.startupId));
      const targetStartupIds = new Set(verifiedStartups.map((s) => s.id));

      const toRemove = existing.filter((e) => !targetStartupIds.has(e.startupId));
      if (toRemove.length > 0) {
        await tx.startupAssignment.deleteMany({
          where: { id: { in: toRemove.map((e) => e.id) } },
        });
      }

      const toAdd = verifiedStartups.filter((s) => !existingStartupIds.has(s.id));
      if (toAdd.length > 0) {
        await tx.startupAssignment.createMany({
          data: toAdd.map((s) => ({ startupId: s.id, personId: mentorId, role: AssignmentRole.MENTOR })),
        });
      }

      const startupNames = verifiedStartups.map((s) => s.name).join(', ') || 'none';
      await tx.activityLog.create({
        data: auditData({
          actor: session.user,
          entityType: 'StartupAssignment',
          entityId: mentorId,
          action: 'mentor_allocations_saved',
          summary: `Updated startup assignments for ${mentor.name}: ${startupNames} (${verifiedStartups.length} assigned)`,
        }),
      });
    });

    revalidatePath('/directory');
    revalidatePath('/settings');
    revalidatePath('/startups');
    revalidatePath('/audit');
    revalidatePath('/mapping');
    revalidatePath('/startups', 'layout');
    return { status: 'success', message: `Saved ${verifiedStartups.length} incubatee(s) for ${mentor.name}. Use Email workspace to notify the participants.` };
  } catch (error) {
    return { status: 'error', message: message(error) };
  }
}

export async function saveDeliveryAssignmentAction(formData: FormData) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, 'people:manage') && session.user.role !== Role.PROGRAM_TEAM) throw new Error('Forbidden');
  const startupId = requiredText(formData, 'startupId', 64);
  const personId = requiredText(formData, 'personId', 64);
  const assignmentKind = requiredText(formData, 'assignmentKind', 32);
  const role = assignmentKind === 'EXPERT' ? AssignmentRole.EXPERT : assignmentKind === 'INTERN' ? AssignmentRole.INTERN : AssignmentRole.PROGRAM_LEAD;
  const allowedRoles = role === AssignmentRole.EXPERT ? [Role.EXPERT] : role === AssignmentRole.INTERN ? [Role.INTERN] : [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM];
  const person = await prisma.person.findFirstOrThrow({ where: { id: personId, role: { in: allowedRoles }, isActive: true }, select: { name: true } });
  await prisma.$transaction(async (tx) => {
    const assignment = await tx.startupAssignment.upsert({ where: { startupId_personId_role: { startupId, personId, role } }, update: {}, create: { startupId, personId, role } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'StartupAssignment', entityId: assignment.id, action: 'delivery_assignment_finalized', summary: `Assigned ${person.name} as ${assignmentKind.toLowerCase().replace('_', ' ')}` }) });
  });
  revalidatePath('/settings');
  revalidatePath('/startups');
  revalidatePath(`/startups/${startupId}`);
  revalidatePath('/audit');
}

