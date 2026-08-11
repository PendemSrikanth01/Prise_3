'use server';

import { compare, hash } from 'bcryptjs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { clearAuthSession, createAuthSession, privacyHash, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { text } from '@/lib/form';

export type AuthActionState = { error?: string } | undefined;

function strongPassword(value: string) {
  return value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

export async function loginAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = text(formData, 'email', 254).toLowerCase();
  const password = text(formData, 'password', 256);
  if (!email || !password) return { error: 'Enter your email and password.' };

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const emailHash = privacyHash(email);
  const ipHash = privacyHash(forwarded);
  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  const [accountFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.count({
      where: { emailHash, ipHash, successful: false, createdAt: { gte: windowStart } },
    }),
    prisma.loginAttempt.count({
      where: { ipHash, successful: false, createdAt: { gte: windowStart } },
    }),
  ]);
  if (accountFailures >= 5 || ipFailures >= 25) {
    return { error: 'Too many attempts. Wait 15 minutes and try again.' };
  }

  const person = await prisma.person.findUnique({ where: { email } });
  const valid = person?.isActive ? await compare(password, person.passwordHash) : await compare(password, await hash('invalid-login-value', 12));
  await prisma.loginAttempt.create({ data: { emailHash, ipHash, successful: Boolean(valid && person?.isActive) } });

  if (!valid || !person?.isActive) return { error: 'Email or password is incorrect.' };

  await Promise.all([
    prisma.person.update({ where: { id: person.id }, data: { lastLoginAt: new Date() } }),
    prisma.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ]);
  await createAuthSession(person.id, requestHeaders.get('user-agent'));
  redirect(person.mustChangePassword ? '/account/password' : '/');
}

export async function logoutAction() {
  await clearAuthSession();
  redirect('/login');
}

export async function changePasswordAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const session = await requireSession({ allowPasswordChange: true });
  const currentPassword = text(formData, 'currentPassword', 256);
  const newPassword = text(formData, 'newPassword', 256);
  const confirmPassword = text(formData, 'confirmPassword', 256);
  if (newPassword !== confirmPassword) return { error: 'The new passwords do not match.' };
  if (!strongPassword(newPassword)) return { error: 'Use 12+ characters with uppercase, lowercase, a number and a symbol.' };

  const person = await prisma.person.findUniqueOrThrow({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!(await compare(currentPassword, person.passwordHash))) return { error: 'Current password is incorrect.' };
  if (await compare(newPassword, person.passwordHash)) return { error: 'Choose a password you have not just used.' };

  const passwordHash = await hash(newPassword, 12);
  await prisma.$transaction([
    prisma.person.update({ where: { id: session.user.id }, data: { passwordHash, mustChangePassword: false } }),
    prisma.authSession.updateMany({ where: { personId: session.user.id, id: { not: session.sessionId } }, data: { revokedAt: new Date() } }),
  ]);
  redirect('/');
}
