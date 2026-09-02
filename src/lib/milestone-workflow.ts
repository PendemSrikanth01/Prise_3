import { MilestoneStakeholderState, ReviewDecision } from '@prisma/client';

export function reviewDecisionLaneState(decision: ReviewDecision) {
  if (decision === ReviewDecision.COMMENTED) return null;
  return decision === ReviewDecision.APPROVED ? MilestoneStakeholderState.APPROVED : MilestoneStakeholderState.NEEDS_REVISION;
}

export function milestoneFinalizationPatch(isProgramRole: boolean) {
  return isProgramRole ? { isFinalized: true as const } : {};
}
