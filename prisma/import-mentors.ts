import { randomBytes, randomUUID } from 'node:crypto';
import { chown, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import bcrypt from 'bcryptjs';
import { MentorMeetingMode, NotificationKind, PrismaClient, Role } from '@prisma/client';

type MentorImport = {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  designation?: string;
  professionalBio?: string;
  professionalDomain?: string;
  mentorLocation?: string;
  mentoringFrequency?: string;
  linkedinUrl?: string;
  expertiseAreas?: string[];
  preferredSectors?: string[];
  languages?: string[];
  yearsExperience?: number;
  maxStartupCapacity?: number;
  preferredMeetingMode?: MentorMeetingMode;
  photoFile?: string;
  photoDriveId?: string;
  photoMimeType?: string;
};

const prisma = new PrismaClient();
const importPath = resolve(process.env.MENTOR_IMPORT_FILE || 'private-imports/mentors.json');
const credentialsPath = resolve(process.env.MENTOR_CREDENTIALS_FILE || 'private-imports/mentor-credentials.csv');
const uploadRoot = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
const apply = process.env.MENTOR_IMPORT_APPLY === 'true';
const deactivateUnlisted = process.env.DEACTIVATE_UNLISTED_MENTORS === 'true';

function structuredProfile(mentor: MentorImport) {
  const bio = mentor.professionalBio || '';
  const extract = (label: string) => bio.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'))?.[1]?.trim();
  const linkedin = mentor.linkedinUrl || extract('LinkedIn');
  const hasStructuredBio = /^(Domain \/ profession|Location|Mentoring frequency|LinkedIn):/im.test(bio);
  return {
    professionalBio: hasStructuredBio ? null : mentor.professionalBio || null,
    professionalDomain: mentor.professionalDomain || extract('Domain / profession') || null,
    mentorLocation: mentor.mentorLocation || extract('Location') || null,
    mentoringFrequency: mentor.mentoringFrequency || extract('Mentoring frequency') || null,
    linkedinUrl: linkedin && /^https:\/\/(?:[a-z0-9-]+\.)?linkedin\.com\//i.test(linkedin) ? linkedin : null,
  };
}

function email(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error(`Invalid mentor email: ${value}`);
  return normalized;
}

function csv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function temporaryPassword() {
  return `PrISE@${randomBytes(9).toString('base64url')}`;
}

async function downloadPhoto(mentor: MentorImport) {
  if (!mentor.photoFile && !mentor.photoDriveId) return null;
  let bytes: Uint8Array;
  let contentType = mentor.photoMimeType || '';
  if (mentor.photoFile) {
    const importRoot = dirname(importPath);
    const sourcePath = resolve(importRoot, mentor.photoFile);
    if (!sourcePath.startsWith(`${importRoot}${sep}`)) throw new Error('Photo path must stay inside the private import directory.');
    bytes = new Uint8Array(await readFile(sourcePath));
    if (!contentType) {
      const extension = extname(sourcePath).toLowerCase();
      contentType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
    }
  } else {
    const response = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(mentor.photoDriveId!)}&export=download&confirm=t`);
    if (!response.ok) throw new Error(`Photo download failed (${response.status})`);
    bytes = new Uint8Array(await response.arrayBuffer());
    contentType = response.headers.get('content-type')?.split(';')[0] || contentType;
  }
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Photo must be between 1 byte and 10 MB.');
  const extension = contentType === 'image/png' ? '.png' : contentType === 'image/webp' ? '.webp' : '.jpg';
  const signature = Buffer.from(bytes.slice(0, 12)).toString('hex');
  const valid = extension === '.jpg' ? signature.startsWith('ffd8ff') : extension === '.png' ? signature.startsWith('89504e470d0a1a0a') : signature.startsWith('52494646');
  if (!valid) throw new Error('Downloaded photo has an invalid image signature.');
  const storageKey = `${randomUUID()}${extension}`;
  await mkdir(uploadRoot, { recursive: true });
  await writeFile(join(uploadRoot, storageKey), bytes, { flag: 'wx', mode: 0o600 });
  await chown(join(uploadRoot, storageKey), 1001, 1001).catch(() => undefined);
  return { storageKey, mimeType: contentType || mentor.photoMimeType || 'image/jpeg' };
}

async function queueWelcome(person: { id: string; name: string; email: string }) {
  const appUrl = `${process.env.APP_URL || 'https://prise.bvcsrb.org'}/login`;
  const subject = 'Welcome to the PrISE 3.0 workspace';
  const text = `Hi ${person.name},\n\nYour mentor account is ready. Use the temporary password shared privately by the program lead, then choose a private password.\n\nOpen PrISE 3.0: ${appUrl}\n\nPrISE 3.0 incubation team`;
  const escaped = text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character).replaceAll('\n', '<br>');
  await prisma.notification.create({ data: { recipientId: person.id, recipientEmail: person.email, kind: NotificationKind.ACCOUNT_WELCOME, subject, textBody: text, htmlBody: `<div style="font-family:Arial,sans-serif;line-height:1.6">${escaped}</div>`, relatedEntityType: 'Person', relatedEntityId: person.id } });
}

async function main() {
  const mentors = JSON.parse(await readFile(importPath, 'utf8')) as MentorImport[];
  if (!Array.isArray(mentors) || !mentors.length) throw new Error('Mentor import file is empty.');
  const normalized = mentors.map((mentor) => ({ ...mentor, name: mentor.name.trim(), email: email(mentor.email) }));
  if (new Set(normalized.map(({ email }) => email)).size !== normalized.length) throw new Error('Mentor import contains duplicate email addresses.');

  const existing = await prisma.person.findMany({ where: { role: Role.MENTOR }, select: { id: true, name: true, email: true, isActive: true, passwordHash: true, _count: { select: { assignments: true, facilitatedSessions: true, activityLogs: true } } }, orderBy: { name: 'asc' } });
  const conflictingAccounts = await prisma.person.findMany({
    where: { email: { in: normalized.map(({ email }) => email) }, role: { not: Role.MENTOR } },
    select: { email: true, role: true },
  });
  if (conflictingAccounts.length) {
    throw new Error(`Import stopped: these emails already belong to non-mentor accounts: ${conflictingAccounts.map(({ email, role }) => `${email} (${role})`).join(', ')}`);
  }
  const incomingEmails = new Set(normalized.map(({ email }) => email));
  const toCreate = normalized.filter((mentor) => !existing.some((person) => person.email.toLowerCase() === mentor.email));
  const toUpdate = normalized.filter((mentor) => existing.some((person) => person.email.toLowerCase() === mentor.email));
  const toDeactivate = existing.filter((person) => !incomingEmails.has(person.email.toLowerCase()) && person.isActive);

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', profiles: normalized.length, create: toCreate.map(({ name, email }) => ({ name, email })), update: toUpdate.map(({ name, email }) => ({ name, email })), deactivate: toDeactivate.map(({ id, name, email, _count }) => ({ id, name, email, linkedRecords: _count })) }, null, 2));
  if (!apply) return;

  const credentials = ['name,email,temporary_password'];
  for (const mentor of normalized) {
    const structured = structuredProfile(mentor);
    const current = existing.find((person) => person.email.toLowerCase() === mentor.email);
    let photo: Awaited<ReturnType<typeof downloadPhoto>> = null;
    if (mentor.photoFile || mentor.photoDriveId) {
      try { photo = await downloadPhoto(mentor); } catch (error) { console.warn(`${mentor.name}: ${error instanceof Error ? error.message : 'photo skipped'}`); }
    }
    const password = current ? null : temporaryPassword();
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    const person = await prisma.person.upsert({
      where: { email: mentor.email },
      update: { name: mentor.name, phone: mentor.phone || null, role: Role.MENTOR, isActive: true, organization: mentor.organization || null, designation: mentor.designation || null, ...structured, expertiseAreas: mentor.expertiseAreas || [], preferredSectors: mentor.preferredSectors || [], languages: mentor.languages || [], yearsExperience: mentor.yearsExperience || null, maxStartupCapacity: mentor.maxStartupCapacity || 4, acceptingMentees: true, preferredMeetingMode: mentor.preferredMeetingMode || MentorMeetingMode.FLEXIBLE, ...(photo ? { profilePhotoKey: photo.storageKey, profilePhotoMimeType: photo.mimeType } : {}) },
      create: { name: mentor.name, email: mentor.email, phone: mentor.phone || null, role: Role.MENTOR, passwordHash: passwordHash ?? current!.passwordHash, mustChangePassword: true, organization: mentor.organization || null, designation: mentor.designation || null, ...structured, expertiseAreas: mentor.expertiseAreas || [], preferredSectors: mentor.preferredSectors || [], languages: mentor.languages || [], yearsExperience: mentor.yearsExperience || null, maxStartupCapacity: mentor.maxStartupCapacity || 4, acceptingMentees: true, preferredMeetingMode: mentor.preferredMeetingMode || MentorMeetingMode.FLEXIBLE, ...(photo ? { profilePhotoKey: photo.storageKey, profilePhotoMimeType: photo.mimeType } : {}) },
      select: { id: true, name: true, email: true },
    });
    await prisma.activityLog.create({ data: { entityType: 'Person', entityId: person.id, action: current ? 'mentor_profile_imported' : 'mentor_account_imported', summary: `${person.name}: mentor ${current ? 'profile updated' : 'account imported'}`, meta: { source: 'PrISE 3.0 mentor profile import' } } });
    if (password) { credentials.push([csv(person.name), csv(person.email), csv(password)].join(',')); await queueWelcome(person); }
  }

  if (deactivateUnlisted && toDeactivate.length) {
    await prisma.$transaction(async (tx) => {
      await tx.person.updateMany({ where: { id: { in: toDeactivate.map(({ id }) => id) } }, data: { isActive: false } });
      await tx.authSession.updateMany({ where: { personId: { in: toDeactivate.map(({ id }) => id) }, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.activityLog.createMany({ data: toDeactivate.map((person) => ({ entityType: 'Person', entityId: person.id, action: 'dummy_mentor_archived', summary: `${person.name}: unlisted mentor account archived during real-data import`, meta: { source: 'PrISE 3.0 mentor profile import' } })) });
    });
  }
  await mkdir(dirname(credentialsPath), { recursive: true });
  await writeFile(credentialsPath, `${credentials.join('\n')}\n`, { mode: 0o600 });
  console.log(`Import complete. New-account credentials: ${credentialsPath}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
