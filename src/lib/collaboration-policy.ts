import { Role, SupportAudience } from '@prisma/client';

export function canAccessSupportThread(input: {
  role: Role;
  audience: SupportAudience;
  isRequester: boolean;
  isExplicitParticipant: boolean;
  isStartupMember: boolean;
  isStartupAssignee: boolean;
}) {
  if (input.role === Role.PROGRAM_LEAD || input.role === Role.PROGRAM_TEAM) return true;
  if (input.isRequester || input.isExplicitParticipant) return true;
  if (input.audience === SupportAudience.STARTUP_TEAM) return input.isStartupMember;
  if (input.audience === SupportAudience.STARTUP_AND_MENTORS) return input.isStartupMember || input.isStartupAssignee;
  return false;
}

export function canDeleteSupportRequest(role: Role) {
  return role === Role.PROGRAM_LEAD || role === Role.PROGRAM_TEAM;
}

export function supportAudienceLabel(audience: SupportAudience) {
  const labels: Record<SupportAudience, string> = {
    STARTUP_TEAM: 'Startup team',
    STARTUP_AND_MENTORS: 'Startup + mentors',
    PROGRAM_PRIVATE: 'Private with program team',
    SELECTED_PEOPLE: 'Selected people',
  };
  return labels[audience];
}
