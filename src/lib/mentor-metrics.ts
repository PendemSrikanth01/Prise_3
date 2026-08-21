export type MentorAttention = 'ON_TRACK' | 'NEEDS_REVIEW' | 'NEEDS_SUPPORT' | 'NEEDS_SESSION' | 'UNASSIGNED' | 'INACTIVE';

export type MentorSignalInput = {
  isActive: boolean;
  assignedStartupCount: number;
  pendingReviewCount: number;
  openSupportCount: number;
  hasUpcomingSession: boolean;
};

export function mentorAttention(input: MentorSignalInput): MentorAttention {
  if (!input.isActive) return 'INACTIVE';
  if (input.assignedStartupCount === 0) return 'UNASSIGNED';
  if (input.openSupportCount > 0) return 'NEEDS_SUPPORT';
  if (input.pendingReviewCount > 0) return 'NEEDS_REVIEW';
  if (!input.hasUpcomingSession) return 'NEEDS_SESSION';
  return 'ON_TRACK';
}

export function mentorAttentionLabel(attention: MentorAttention) {
  const labels: Record<MentorAttention, string> = {
    ON_TRACK: 'On track',
    NEEDS_REVIEW: 'Reviews waiting',
    NEEDS_SUPPORT: 'Support needed',
    NEEDS_SESSION: 'Session needed',
    UNASSIGNED: 'Unassigned',
    INACTIVE: 'Inactive',
  };
  return labels[attention];
}

export function mentorAttentionReason(input: MentorSignalInput, attention: MentorAttention) {
  if (attention === 'INACTIVE') return 'Account is inactive.';
  if (attention === 'UNASSIGNED') return 'Ready to be matched with a startup.';
  if (attention === 'NEEDS_SUPPORT') return `${input.openSupportCount} open support request${input.openSupportCount === 1 ? '' : 's'} need a response.`;
  if (attention === 'NEEDS_REVIEW') return `${input.pendingReviewCount} submitted milestone${input.pendingReviewCount === 1 ? '' : 's'} await review.`;
  if (attention === 'NEEDS_SESSION') return 'No upcoming mentoring session is scheduled.';
  return 'Assignments, reviews and the next session are in place.';
}
