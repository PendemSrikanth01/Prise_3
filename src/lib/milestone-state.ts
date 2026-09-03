import 'server-only';

import { MilestoneStakeholderLane, MilestoneStakeholderState, MilestoneStatus, Prisma } from '@prisma/client'; // MilestoneStatus kept for overall status computation below

type SetLaneInput = { milestoneId: string; lane: MilestoneStakeholderLane; state: MilestoneStakeholderState; updatedById: string; note?: string | null };

export async function setMilestoneLaneState(tx: Prisma.TransactionClient, input: SetLaneInput) {
  const milestone = await tx.milestone.findUniqueOrThrow({ where: { id: input.milestoneId }, select: { submittedAt: true } });
  const existing = await tx.milestoneStakeholderStatus.findMany({ where: { milestoneId: input.milestoneId }, select: { lane: true, state: true } });
  const states = new Map(existing.map((item) => [item.lane, item.state]));
  states.set(input.lane, input.state);
  const startupSubmitted = states.get(MilestoneStakeholderLane.STARTUP) === MilestoneStakeholderState.SUBMITTED;
  const mentorApproved = states.get(MilestoneStakeholderLane.MENTOR) === MilestoneStakeholderState.APPROVED;
  if (input.lane === MilestoneStakeholderLane.MENTOR && input.state === MilestoneStakeholderState.APPROVED && !startupSubmitted) throw new Error('The startup must submit this milestone before mentor approval.');
  if (input.lane === MilestoneStakeholderLane.PROGRAM && input.state === MilestoneStakeholderState.APPROVED && (!startupSubmitted || !mentorApproved)) throw new Error('Startup submission and mentor approval are required before program approval.');

  await tx.milestoneStakeholderStatus.upsert({
    where: { milestoneId_lane: { milestoneId: input.milestoneId, lane: input.lane } },
    update: { state: input.state, note: input.note, updatedById: input.updatedById },
    create: { milestoneId: input.milestoneId, lane: input.lane, state: input.state, note: input.note, updatedById: input.updatedById },
  });

  const hasRevision = [...states.values()].some((state) => state === MilestoneStakeholderState.NEEDS_REVISION);
  const programApproved = states.get(MilestoneStakeholderLane.PROGRAM) === MilestoneStakeholderState.APPROVED;
  const hasProgress = [...states.values()].some((state) => state === MilestoneStakeholderState.IN_PROGRESS || state === MilestoneStakeholderState.BLOCKED);
  const overall = hasRevision
    ? MilestoneStatus.NEEDS_REVISION
    : startupSubmitted && mentorApproved && programApproved
      ? MilestoneStatus.APPROVED
      : startupSubmitted
        ? MilestoneStatus.SUBMITTED
        : hasProgress
          ? MilestoneStatus.IN_PROGRESS
          : MilestoneStatus.NOT_STARTED;
  await tx.milestone.update({ where: { id: input.milestoneId }, data: { status: overall, submittedAt: startupSubmitted ? milestone.submittedAt ?? new Date() : null, approvedAt: overall === MilestoneStatus.APPROVED ? new Date() : null, reviewerId: input.lane === MilestoneStakeholderLane.STARTUP ? undefined : input.updatedById } });
  return overall;
}
