import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const name = process.env.PROGRAM_LEAD_NAME?.trim() || 'Program Lead';
  const email = (process.env.PROGRAM_LEAD_EMAIL?.trim() || 'lead@prise.bvcsrb.org').toLowerCase();
  const password = process.env.PROGRAM_LEAD_PASSWORD || 'Prise@2026';
  const mustChangePassword = process.env.MUST_CHANGE_PASSWORD === 'true';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Set PROGRAM_LEAD_EMAIL to a valid email address.');
  }
  if (password.length < 6) {
    throw new Error('Set PROGRAM_LEAD_PASSWORD to at least 6 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const account = await prisma.person.upsert({
    where: { email },
    update: {
      name,
      role: Role.PROGRAM_LEAD,
      passwordHash,
      isActive: true,
      mustChangePassword,
    },
    create: {
      name,
      email,
      role: Role.PROGRAM_LEAD,
      passwordHash,
      isActive: true,
      mustChangePassword,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  console.log(`Program Lead ready: ${account.name} <${account.email}>`);
  if (mustChangePassword) {
    console.log('The user must choose a new password after the first login.');
  } else {
    console.log('Direct test login enabled (mustChangePassword: false).');
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
