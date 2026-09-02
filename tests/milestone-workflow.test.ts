import assert from 'node:assert/strict';
import test from 'node:test';
import { MilestoneStakeholderState, ReviewDecision } from '@prisma/client';
import { milestoneFinalizationPatch, reviewDecisionLaneState } from '../src/lib/milestone-workflow';

test('a comment does not change an approved milestone lane', () => {
  assert.equal(reviewDecisionLaneState(ReviewDecision.COMMENTED), null);
  assert.equal(reviewDecisionLaneState(ReviewDecision.APPROVED), MilestoneStakeholderState.APPROVED);
  assert.equal(reviewDecisionLaneState(ReviewDecision.REVISION_REQUESTED), MilestoneStakeholderState.NEEDS_REVISION);
});

test('only program edits explicitly finalize a milestone plan', () => {
  assert.deepEqual(milestoneFinalizationPatch(false), {});
  assert.deepEqual(milestoneFinalizationPatch(true), { isFinalized: true });
});
