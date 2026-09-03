const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function split(values: string[]) {
  return values.flatMap((value) => value.split(/[\s,;]+/)).map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function normalizeEmailList(values: string[]) {
  const emails = [...new Set(split(values))];
  const invalid = emails.find((email) => email.length > 254 || !EMAIL_PATTERN.test(email));
  if (invalid) throw new Error(`Invalid email address: ${invalid}`);
  return emails;
}

export function normalizeRecipients(input: { to: string[]; cc: string[]; bcc: string[] }, limit = 50) {
  const to = normalizeEmailList(input.to);
  const used = new Set(to);
  const cc = normalizeEmailList(input.cc).filter((email) => !used.has(email) && used.add(email));
  const bcc = normalizeEmailList(input.bcc).filter((email) => !used.has(email) && used.add(email));
  if (!to.length) throw new Error('Add at least one recipient.');
  if (used.size > limit) throw new Error(`Use no more than ${limit} total recipients.`);
  return { to, cc, bcc };
}
