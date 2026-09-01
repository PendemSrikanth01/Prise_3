import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { NotificationKind, OnboardingItemType, OnboardingStatus, PaymentStatus, Prisma, PrismaClient, Role, StartupMemberRole, StartupStatus } from '@prisma/client';

type ImportRow = {
  sNo: number; startupName: string; founderName: string; founderEmail: string; founderPhone?: string;
  fullAddress?: string; operationLocation?: string; state?: string; sector?: string; legalStructure?: string;
  actualFee?: number | null; agreedFee?: number | null; agreedFeeRemarks?: string; totalFeePaid?: number;
  documentFolderReference?: string; status: StartupStatus;
  onboarding: Partial<Record<OnboardingItemType, OnboardingStatus>>;
  payments: { dueDate: string; amount: number }[];
};

const prisma = new PrismaClient();
const importPath = resolve(process.env.INCUBATEE_IMPORT_FILE || 'private-imports/incubatees.json');
const credentialsPath = resolve(process.env.INCUBATEE_CREDENTIALS_FILE || 'private-imports/incubatee-credentials.csv');
const apply = process.env.INCUBATEE_IMPORT_APPLY === 'true';
const activeStatuses = new Set<StartupStatus>([StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION]);

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const temporaryPassword = () => `PrISE@${randomBytes(9).toString('base64url')}`;
const csv = (value: string) => `"${value.replaceAll('"', '""')}"`;
const optional = (value?: string) => value?.trim() || null;

function validate(rows: ImportRow[]) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Incubatee import file is empty.');
  const serials = new Set<number>();
  const activeEmails = new Set<string>();
  for (const row of rows) {
    row.founderEmail = normalizeEmail(row.founderEmail);
    if (!Number.isInteger(row.sNo) || row.sNo < 1 || serials.has(row.sNo)) throw new Error(`Invalid or duplicate S.No: ${row.sNo}`);
    if (!row.startupName?.trim() || !row.founderName?.trim() || !/^\S+@\S+\.\S+$/.test(row.founderEmail)) throw new Error(`Invalid profile at S.No ${row.sNo}`);
    serials.add(row.sNo);
    if (activeStatuses.has(row.status)) {
      if (activeEmails.has(row.founderEmail)) throw new Error(`Duplicate active incubatee email: ${row.founderEmail}`);
      activeEmails.add(row.founderEmail);
    }
  }
}

async function queueWelcome(tx: Prisma.TransactionClient, person: { id: string; name: string; email: string }) {
  const appUrl = `${process.env.APP_URL || 'https://prise.bvcsrb.org'}/login`;
  const text = `Hi ${person.name},\n\nYour incubatee account is ready and connected to your startup. Use the temporary password shared privately by the program lead, then choose a private password.\n\nOpen PrISE 3.0: ${appUrl}\n\nPrISE 3.0 incubation team`;
  await tx.notification.create({ data: { recipientId: person.id, recipientEmail: person.email, kind: NotificationKind.ACCOUNT_WELCOME, subject: 'Welcome to the PrISE 3.0 workspace', textBody: text, htmlBody: `<div style="font-family:Arial,sans-serif;line-height:1.6">${text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character).replaceAll('\n', '<br>')}</div>`, relatedEntityType: 'Person', relatedEntityId: person.id } });
}

async function main() {
  const rows = JSON.parse(await readFile(importPath, 'utf8')) as ImportRow[];
  validate(rows);
  const emails = rows.map(({ founderEmail }) => founderEmail);
  const [startups, people, conflicts] = await Promise.all([
    prisma.startup.findMany({ where: { sNo: { in: rows.map(({ sNo }) => sNo) } }, select: { id: true, sNo: true, name: true, founderEmail: true } }),
    prisma.person.findMany({ where: { email: { in: emails } }, select: { id: true, name: true, email: true, role: true, isActive: true, founderOfStartupId: true } }),
    prisma.person.findMany({ where: { email: { in: emails }, role: { not: Role.FOUNDER } }, select: { email: true, role: true } }),
  ]);
  if (conflicts.length) throw new Error(`Import stopped: ${conflicts.map(({ email, role }) => `${email} belongs to ${role}`).join(', ')}`);

  const activeRows = rows.filter(({ status }) => activeStatuses.has(status));
  const report = {
    mode: apply ? 'apply' : 'dry-run', startups: rows.length, activeAccounts: activeRows.length,
    createAccounts: activeRows.filter((row) => !people.some((person) => person.email === row.founderEmail)).map(({ founderName, founderEmail, startupName }) => ({ founderName, founderEmail, startupName })),
    updateAccounts: activeRows.filter((row) => people.some((person) => person.email === row.founderEmail)).map(({ founderName, founderEmail, startupName }) => ({ founderName, founderEmail, startupName })),
    inactiveHistory: rows.filter(({ status }) => !activeStatuses.has(status)).map(({ startupName, status }) => ({ startupName, status })),
    startupUpdates: rows.filter((row) => startups.some((startup) => startup.sNo === row.sNo)).length,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!apply) return;

  const credentials = ['name,email,startup,temporary_password'];
  for (const row of rows) {
    const isActive = activeStatuses.has(row.status);
    const existingPerson = people.find((person) => person.email === row.founderEmail);
    const password = isActive && !existingPerson ? temporaryPassword() : null;
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    await prisma.$transaction(async (tx) => {
      const existingStartup = await tx.startup.findUnique({ where: { sNo: row.sNo }, select: { id: true, documentFolderLink: true } });
      const startup = await tx.startup.upsert({
        where: { sNo: row.sNo },
        update: { name: row.startupName.trim(), founderName: row.founderName.trim(), founderEmail: row.founderEmail, founderPhone: optional(row.founderPhone), fullAddress: optional(row.fullAddress), operationLocation: optional(row.operationLocation), state: optional(row.state), sector: optional(row.sector), legalStructure: optional(row.legalStructure), actualFee: row.actualFee ?? null, agreedFee: row.agreedFee ?? null, agreedFeeRemarks: optional(row.agreedFeeRemarks), totalFeePaid: row.totalFeePaid || 0, status: row.status, ...(row.documentFolderReference?.startsWith('http') ? { documentFolderLink: row.documentFolderReference } : {}) },
        create: { sNo: row.sNo, name: row.startupName.trim(), founderName: row.founderName.trim(), founderEmail: row.founderEmail, founderPhone: optional(row.founderPhone), fullAddress: optional(row.fullAddress), operationLocation: optional(row.operationLocation), state: optional(row.state), sector: optional(row.sector), legalStructure: optional(row.legalStructure), actualFee: row.actualFee ?? null, agreedFee: row.agreedFee ?? null, agreedFeeRemarks: optional(row.agreedFeeRemarks), totalFeePaid: row.totalFeePaid || 0, status: row.status, documentFolderLink: row.documentFolderReference?.startsWith('http') ? row.documentFolderReference : null },
        select: { id: true },
      });

      for (const type of Object.values(OnboardingItemType)) {
        const status = row.onboarding[type] || (isActive ? OnboardingStatus.PENDING : OnboardingStatus.NA);
        await tx.onboardingItem.upsert({ where: { startupId_type: { startupId: startup.id, type } }, update: { status, submittedAt: status === OnboardingStatus.SUBMITTED ? new Date() : null }, create: { startupId: startup.id, type, status, submittedAt: status === OnboardingStatus.SUBMITTED ? new Date() : null } });
      }
      for (const payment of row.payments || []) {
        const dueDate = new Date(`${payment.dueDate}T00:00:00.000Z`);
        const existing = await tx.paymentInstallment.findFirst({ where: { startupId: startup.id, dueDate }, select: { id: true } });
        const data = { amount: payment.amount, status: PaymentStatus.PAID, paidAt: dueDate, reference: 'Imported from PrISE 3.0 tracker' };
        if (existing) await tx.paymentInstallment.update({ where: { id: existing.id }, data });
        else await tx.paymentInstallment.create({ data: { startupId: startup.id, dueDate, ...data } });
      }

      if (isActive) {
        const person = await tx.person.upsert({
          where: { email: row.founderEmail },
          update: { name: row.founderName.trim(), phone: optional(row.founderPhone), role: Role.FOUNDER, isActive: true },
          create: { name: row.founderName.trim(), email: row.founderEmail, phone: optional(row.founderPhone), role: Role.FOUNDER, passwordHash: passwordHash!, mustChangePassword: true },
          select: { id: true, name: true, email: true },
        });
        await tx.person.updateMany({ where: { founderOfStartupId: startup.id, id: { not: person.id } }, data: { founderOfStartupId: null } });
        await tx.startupMembership.updateMany({ where: { startupId: startup.id, personId: { not: person.id }, role: StartupMemberRole.OWNER }, data: { isActive: false } });
        await tx.startupMembership.updateMany({ where: { personId: person.id, startupId: { not: startup.id }, isActive: true }, data: { isActive: false } });
        await tx.startupMembership.upsert({ where: { startupId_personId: { startupId: startup.id, personId: person.id } }, update: { role: StartupMemberRole.OWNER, isActive: true }, create: { startupId: startup.id, personId: person.id, role: StartupMemberRole.OWNER, isActive: true } });
        await tx.person.update({ where: { id: person.id }, data: { founderOfStartupId: startup.id } });
        if (password) await queueWelcome(tx, person);
        await tx.activityLog.create({ data: { startupId: startup.id, entityType: 'Person', entityId: person.id, action: existingPerson ? 'incubatee_profile_imported' : 'incubatee_account_imported', summary: `${person.name}: incubatee ${existingPerson ? 'profile updated and remapped' : 'account created and mapped'}`, meta: { source: 'PrISE 3.0 incubatee tracker' } } });
        if (password) credentials.push([csv(person.name), csv(person.email), csv(row.startupName), csv(password)].join(','));
      } else if (existingPerson) {
        await tx.person.update({ where: { id: existingPerson.id }, data: { isActive: false, founderOfStartupId: null } });
        await tx.authSession.updateMany({ where: { personId: existingPerson.id, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.startupMembership.updateMany({ where: { personId: existingPerson.id }, data: { isActive: false } });
      }
      await tx.activityLog.create({ data: { startupId: startup.id, entityType: 'Startup', entityId: startup.id, action: existingStartup ? 'startup_profile_imported' : 'startup_profile_created', summary: `${row.startupName}: tracker profile reconciled`, meta: { source: 'PrISE 3.0 incubatee tracker', sNo: row.sNo, status: row.status } } });
    });
  }
  await mkdir(dirname(credentialsPath), { recursive: true });
  await writeFile(credentialsPath, `${credentials.join('\n')}\n`, { mode: 0o600 });
  console.log(`Import complete. New-account credentials: ${credentialsPath}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
