import { normalizeEmailList } from '@/lib/email-addresses';

export function priseTeamEmails() {
  return normalizeEmailList([process.env.PRISE_TEAM_CC || process.env.MAIL_REPLY_TO || '']);
}
