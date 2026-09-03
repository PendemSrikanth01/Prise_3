import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { clearInactivePersonData } from '../src/lib/person-deactivation';

const prisma = new PrismaClient();
const apply = process.env.INACTIVE_CLEANUP_APPLY === 'true';
const uploadRoot = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

async function main() {
  const people = await prisma.person.findMany({
    where: { isActive: false, NOT: { email: { endsWith: '@deleted.invalid' } } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, profilePhotoKey: true },
  });

  console.log(`${apply ? 'Cleaning' : 'Would clean'} ${people.length} inactive account(s).`);
  if (!apply) {
    people.forEach(({ name, email }) => console.log(`- ${name} <${email}>`));
    return;
  }

  for (const person of people) {
    const storageKeys = await prisma.$transaction((tx) => clearInactivePersonData(tx, person));
    await Promise.all(storageKeys.map((storageKey) => /^[a-f0-9-]{36}\.[a-z0-9]+$/i.test(storageKey)
      ? unlink(join(uploadRoot, storageKey)).catch(() => undefined)
      : Promise.resolve()));
    console.log(`Cleaned inactive account: ${person.name} <${person.email}>`);
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
