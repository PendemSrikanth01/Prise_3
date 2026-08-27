import { Role } from '@prisma/client';

export function roleLabel(role: Role | string) {
  if (role === Role.FOUNDER || role === 'FOUNDER') return 'Incubatee';
  return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

