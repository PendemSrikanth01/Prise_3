import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.env.ACCOUNT_RESET_APPLY === 'true';
const password = process.env.ACCOUNT_RESET_PASSWORD || '';
const allowedRoles = new Set<Role>([Role.MENTOR, Role.FOUNDER]);
const roles = (process.env.ACCOUNT_RESET_ROLES || 'MENTOR,FOUNDER')
  .split(',')
  .map((value) => value.trim().toUpperCase())
  .filter((value): value is Role => allowedRoles.has(value as Role));

async function main() {
  if (roles.length === 0) throw new Error('Choose MENTOR, FOUNDER, or both in ACCOUNT_RESET_ROLES.');
  if (apply && password.length < 10) throw new Error('Temporary password must contain at least 10 characters.');

  const people = await prisma.person.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
  const counts = Object.fromEntries(roles.map((role) => [role, people.filter((person) => person.role === role).length]));
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', counts, total: people.length }, null, 2));
  if (!apply) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    await tx.person.updateMany({ where: { id: { in: people.map(({ id }) => id) } }, data: { passwordHash, mustChangePassword: true } });
    await tx.authSession.updateMany({ where: { personId: { in: people.map(({ id }) => id) }, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.activityLog.createMany({ data: people.map((person) => ({ entityType: 'Person', entityId: person.id, action: 'temporary_password_reset', summary: `${person.name}: temporary password reset; change required at next login`, meta: { role: person.role, source: 'program account reset tool' } })) });
  });
  console.log(`Password reset completed for ${people.length} active accounts. Existing sessions were revoked.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
