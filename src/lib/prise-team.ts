import { normalizeEmailList } from '@/lib/email-addresses';

const DEFAULT_PRISE_TEAM_CC = 'vijender@balavikasa.org,shamini@balavikasa.org,janani@balavikasa.org';

export function priseTeamEmails() {
  return normalizeEmailList([process.env.PRISE_TEAM_CC || DEFAULT_PRISE_TEAM_CC]);
}
